import { Router } from "express";
import { PromptRequestSchema } from "@zeno/shared";
import {
  buildDraftProjectName,
  processProjectPrompt,
  PromptProcessingError,
} from "../services/prompt-processing.service";
import {
  createProject,
  saveMessages,
  updateProjectMetadata,
} from "../services/conversation.service";

const router = Router();

router.post("/", async (req, res) => {
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
  } = parsed.data;

  console.log("\n" + "━".repeat(60));
  console.log(`[REQUEST] prompt: "${prompt}"`);
  console.log(`[REQUEST] projectId: ${incomingProjectId ?? "(new)"}`);
  console.log("━".repeat(60) + "\n");

  try {
    const isNewProject = !incomingProjectId;
    const projectId =
      incomingProjectId ?? (await createProject(buildDraftProjectName(prompt)));
    const result = await processProjectPrompt({
      prompt,
      projectId,
      selectedVariantId,
      currentRevisionId,
    });

    await saveMessages(projectId, result.turnData);

    if (isNewProject) {
      await updateProjectMetadata(projectId, {
        name: result.projectName,
      });
    }

    return res.json(result.response);
  } catch (error) {
    console.error(error);

    if (error instanceof PromptProcessingError) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to process generation",
    });
  }
});

export default router;
