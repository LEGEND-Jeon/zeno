import {
  AssistantInteractionSchema,
  ChoiceResponseSchema,
  type ProjectDetailResponse,
} from "@zeno/shared";
import { prisma } from "../lib/prisma";
import { loadLatestGeneration } from "./project-store.service";

const DEFAULT_USER_ID = "anonymous";

function parseAssistantInteraction(value: unknown) {
  const parsed = AssistantInteractionSchema.nullable().safeParse(value ?? null);
  return parsed.success ? parsed.data : null;
}

function parseChoiceResponse(value: unknown) {
  const parsed = ChoiceResponseSchema.nullable().safeParse(value ?? null);
  return parsed.success ? parsed.data : null;
}

export async function loadProjectDetail(
  projectId: string,
  userId = DEFAULT_USER_ID,
): Promise<ProjectDetailResponse | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  const latestGeneration = await loadLatestGeneration(projectId);

  return {
    ok: true,
    project: {
      id: project.id,
      userId: project.userId,
      name: project.name,
      selectedVariantId: project.selectedVariantId,
      currentRevisionId: project.currentRevisionId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    messages: project.messages.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      status:
        message.status as ProjectDetailResponse["messages"][number]["status"],
      mode: message.mode as ProjectDetailResponse["messages"][number]["mode"],
      generationId: message.generationId,
      interaction: parseAssistantInteraction(message.interaction),
      choiceResponse: parseChoiceResponse(message.choiceResponse),
      errorMessage: message.errorMessage,
      createdAt: message.createdAt.toISOString(),
    })),
    latestGeneration,
  };
}
