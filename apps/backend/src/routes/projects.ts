import type { Response } from "express";
import { Router } from "express";
import {
  ProjectCancelResponseSchema,
  ProjectDetailResponseSchema,
  ProjectSubmitResponseSchema,
  PromptRequestSchema,
  type ProjectMessageStatus,
} from "@zeno/shared";
import { loadProjectDetail } from "../services/project-query.service";
import {
  buildDraftProjectName,
  processProjectPrompt,
} from "../services/prompt-processing.service";
import {
  cancelAssistantMessage,
  completeAssistantMessage,
  ConversationInputError,
  createPendingTurn,
  createProject,
  failAssistantMessage,
  loadAssistantMessage,
  markAssistantMessageFinalizing,
  markAssistantMessageStreaming,
  resolveChoiceResponse,
  updateProjectMetadata,
  type AssistantMessageRecord,
} from "../services/conversation.service";
import {
  appendProjectRunDelta,
  buildProjectRunSnapshot,
  cancelProjectRun,
  completeProjectRun,
  createProjectRun,
  failProjectRun,
  getActiveProjectRunForProject,
  getProjectRun,
  markProjectRunFinalizing,
  subscribeToProjectRun,
  type StreamEventName,
  type StreamEventPayload,
} from "../services/project-run.service";

const router = Router();

function writeSse(
  res: Response,
  event: StreamEventName,
  payload: StreamEventPayload,
) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function prepareSseResponse(res: Response) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

function isTerminalStatus(status: ProjectMessageStatus) {
  return (
    status === "completed" || status === "failed" || status === "cancelled"
  );
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "APIUserAbortError")
  );
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function endSseWithStoredMessage(
  res: Response,
  assistantMessage: AssistantMessageRecord,
) {
  writeSse(res, "snapshot", {
    assistantMessageId: assistantMessage.id,
    content: assistantMessage.content,
    status: assistantMessage.status,
    interaction: assistantMessage.interaction,
    errorMessage: assistantMessage.errorMessage,
  });

  const eventName =
    assistantMessage.status === "cancelled"
      ? "cancelled"
      : assistantMessage.status === "failed"
        ? "failed"
        : "completed";

  writeSse(res, eventName, {
    assistantMessageId: assistantMessage.id,
    content: assistantMessage.content,
    status: assistantMessage.status,
    interaction: assistantMessage.interaction,
    errorMessage: assistantMessage.errorMessage,
  });

  res.end();
}

router.get(
  "/:projectId/messages/:assistantMessageId/stream",
  async (req, res) => {
    const projectId = req.params.projectId?.trim();
    const assistantMessageId = req.params.assistantMessageId?.trim();

    if (!projectId || !assistantMessageId) {
      return res.status(400).json({
        ok: false,
        message: "projectId and assistantMessageId are required",
      });
    }

    const runSnapshot = buildProjectRunSnapshot(assistantMessageId);

    if (!runSnapshot) {
      const assistantMessage = await loadAssistantMessage(
        projectId,
        assistantMessageId,
      );

      if (!assistantMessage) {
        return res.status(404).json({
          ok: false,
          message: "Assistant message not found",
        });
      }

      if (isTerminalStatus(assistantMessage.status)) {
        prepareSseResponse(res);
        endSseWithStoredMessage(res, assistantMessage);
        return;
      }

      return res.status(404).json({
        ok: false,
        message: "Active stream not found",
      });
    }

    prepareSseResponse(res);
    writeSse(res, "snapshot", runSnapshot);

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15000);

    const unsubscribe = subscribeToProjectRun(
      assistantMessageId,
      (event, payload) => {
        writeSse(res, event, payload);

        if (
          event === "completed" ||
          event === "failed" ||
          event === "cancelled"
        ) {
          clearInterval(heartbeat);
          unsubscribe?.();
          res.end();
        }
      },
    );

    if (!unsubscribe) {
      clearInterval(heartbeat);

      const assistantMessage = await loadAssistantMessage(
        projectId,
        assistantMessageId,
      );

      if (assistantMessage && isTerminalStatus(assistantMessage.status)) {
        endSseWithStoredMessage(res, assistantMessage);
        return;
      }

      res.end();
      return;
    }

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe?.();
    });
  },
);

router.get("/:projectId", async (req, res) => {
  const projectId = req.params.projectId?.trim();

  if (!projectId) {
    return res.status(400).json({
      ok: false,
      message: "projectId is required",
    });
  }

  try {
    const project = await loadProjectDetail(projectId);

    if (!project) {
      return res.status(404).json({
        ok: false,
        message: "Project not found",
      });
    }

    return res.json(ProjectDetailResponseSchema.parse(project));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to load project",
    });
  }
});

router.post("/submit", async (req, res) => {
  const rawBody = req.body ?? {};
  const rawPrompt = rawBody.prompt;
  const normalizedPrompt =
    typeof rawPrompt === "string"
      ? rawPrompt
      : rawPrompt !== null && typeof rawPrompt === "object"
        ? String((rawPrompt as Record<string, unknown>).label ?? (rawPrompt as Record<string, unknown>).prompt ?? "")
        : String(rawPrompt ?? "");
  const parsed = PromptRequestSchema.safeParse({ ...rawBody, prompt: normalizedPrompt });

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid request body",
      errors: parsed.error.flatten(),
    });
  }

  const {
    prompt,
    projectId: incomingProjectId,
    selectedVariantId,
    currentRevisionId,
    choiceResponse,
  } = parsed.data;

  try {
    const isNewProject = !incomingProjectId;

    if (choiceResponse && !incomingProjectId) {
      return res.status(400).json({
        ok: false,
        message: "projectId is required for choice responses",
      });
    }

    const resolvedChoiceResponse =
      choiceResponse && incomingProjectId
        ? await resolveChoiceResponse(incomingProjectId, choiceResponse)
        : null;
    const effectivePrompt = resolvedChoiceResponse?.effectivePrompt ?? prompt;
    const displayPrompt = resolvedChoiceResponse?.displayPrompt ?? prompt;
    const projectId =
      incomingProjectId ??
      (await createProject(buildDraftProjectName(effectivePrompt)));

    if (getActiveProjectRunForProject(projectId)) {
      return res.status(409).json({
        ok: false,
        message: "A project response is already in progress",
      });
    }

    const pendingTurn = await createPendingTurn(
      projectId,
      displayPrompt,
      resolvedChoiceResponse?.choiceResponse,
    );
    const projectRun = createProjectRun(
      projectId,
      pendingTurn.assistantMessageId,
    );

    res.json(
      ProjectSubmitResponseSchema.parse({
        ok: true,
        projectId,
        userMessageId: pendingTurn.userMessageId,
        assistantMessageId: pendingTurn.assistantMessageId,
        status: "pending",
      }),
    );

    void processProjectPrompt({
      prompt: effectivePrompt,
      projectId,
      selectedVariantId,
      currentRevisionId,
      assistantMessageId: pendingTurn.assistantMessageId,
      signal: projectRun.controller.signal,
      onAssistantTextStart: async () => {
        await markAssistantMessageStreaming(pendingTurn.assistantMessageId);
      },
      onAssistantTextDelta: async (delta) => {
        appendProjectRunDelta(pendingTurn.assistantMessageId, delta);
      },
      onAssistantTextFinalizing: async (content) => {
        markProjectRunFinalizing(pendingTurn.assistantMessageId, content);
        await markAssistantMessageFinalizing(
          pendingTurn.assistantMessageId,
          content,
        );
      },
    })
      .then(async (result) => {
        await completeAssistantMessage(
          pendingTurn.assistantMessageId,
          result.turnData,
        );

        if (isNewProject) {
          await updateProjectMetadata(projectId, {
            name: result.projectName,
          });
        }

        completeProjectRun(
          pendingTurn.assistantMessageId,
          result.turnData.assistantMessage.answer,
          result.turnData.assistantMessage.interaction ?? null,
        );
      })
      .catch(async (error) => {
        console.error(error);

        try {
          const partialContent =
            getProjectRun(pendingTurn.assistantMessageId)?.content ?? "";

          if (projectRun.controller.signal.aborted || isAbortError(error)) {
            await cancelAssistantMessage(
              pendingTurn.assistantMessageId,
              partialContent,
            );
            cancelProjectRun(pendingTurn.assistantMessageId, partialContent);
            return;
          }

          const errorMessage = toErrorMessage(
            error,
            "Failed to process project prompt",
          );

          await failAssistantMessage(
            pendingTurn.assistantMessageId,
            errorMessage,
            partialContent,
          );
          failProjectRun(
            pendingTurn.assistantMessageId,
            errorMessage,
            partialContent,
          );
        } catch (messageUpdateError) {
          console.error(messageUpdateError);
        }
      });
  } catch (error) {
    console.error(error);

    if (error instanceof ConversationInputError) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to submit project",
    });
  }
});

router.post(
  "/:projectId/messages/:assistantMessageId/cancel",
  async (req, res) => {
    const projectId = req.params.projectId?.trim();
    const assistantMessageId = req.params.assistantMessageId?.trim();

    if (!projectId || !assistantMessageId) {
      return res.status(400).json({
        ok: false,
        message: "projectId and assistantMessageId are required",
      });
    }

    try {
      const assistantMessage = await loadAssistantMessage(
        projectId,
        assistantMessageId,
      );

      if (!assistantMessage) {
        return res.status(404).json({
          ok: false,
          message: "Assistant message not found",
        });
      }

      const activeRun = getProjectRun(assistantMessageId);

      if (activeRun) {
        activeRun.controller.abort();
      } else if (!isTerminalStatus(assistantMessage.status)) {
        await cancelAssistantMessage(
          assistantMessageId,
          assistantMessage.content,
        );
      }

      return res.json(
        ProjectCancelResponseSchema.parse({
          ok: true,
          assistantMessageId,
          status: activeRun ? activeRun.status : "cancelled",
        }),
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        ok: false,
        message: toErrorMessage(error, "Failed to cancel assistant response"),
      });
    }
  },
);

export default router;
