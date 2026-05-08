import { prisma } from "../lib/prisma";
import {
  AssistantInteractionSchema,
  ChoiceResponseSchema,
  type AssistantInteraction,
  PromptInterpretation,
  AssistantMessage,
  type ChoiceResponse,
  type ChoiceResponseRequest,
  PlannerExecution,
  RequestIntent,
} from "@zeno/shared";
import type { ConversationTurn } from "./planner.service";

export type MessageStatus =
  | "pending"
  | "streaming"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelled";

export interface AssistantMessageRecord {
  id: string;
  projectId: string;
  content: string;
  status: MessageStatus;
  interaction: AssistantInteraction | null;
  errorMessage: string | null;
}

export interface TurnData {
  prompt: string;
  choiceResponse?: ChoiceResponse;
  mode: RequestIntent;
  interpretation: PromptInterpretation;
  assistantMessage: AssistantMessage;
  execution: PlannerExecution;
  generationId?: string;
}

export interface PendingTurnData {
  userMessageId: string;
  assistantMessageId: string;
}

export class ConversationInputError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "ConversationInputError";
  }
}

function parseAssistantInteraction(value: unknown): AssistantInteraction | null {
  const parsed = AssistantInteractionSchema.nullable().safeParse(value ?? null);
  return parsed.success ? parsed.data : null;
}

function parseChoiceResponse(value: unknown): ChoiceResponse | null {
  const parsed = ChoiceResponseSchema.nullable().safeParse(value ?? null);
  return parsed.success ? parsed.data : null;
}

export async function createProject(
  name: string,
  userId = "anonymous",
): Promise<string> {
  const project = await prisma.project.create({
    data: { name, userId },
  });
  return project.id;
}

export async function getProjectHistory(
  projectId: string,
): Promise<ConversationTurn[]> {
  const messages = await prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  const turns: ConversationTurn[] = [];

  let currentUserMessage:
    | {
        content: string;
      }
    | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      const choiceResponse = parseChoiceResponse(message.choiceResponse);

      currentUserMessage = {
        content: choiceResponse?.prompt ?? message.content,
      };
      continue;
    }

    if (!currentUserMessage) {
      continue;
    }

    if (
      message.role === "assistant" &&
      message.status === "completed" &&
      message.mode &&
      message.interpretation &&
      message.execution
    ) {
      turns.push({
        prompt: currentUserMessage.content,
        mode: message.mode as RequestIntent,
        answer: message.content,
        interpretation: message.interpretation as PromptInterpretation,
        execution: message.execution as PlannerExecution,
      });
    }

    currentUserMessage = null;
  }

  return turns;
}

export async function saveMessages(
  projectId: string,
  data: TurnData,
): Promise<void> {
  await prisma.$transaction([
    prisma.message.create({
      data: {
        projectId,
        role: "user",
        content: data.prompt,
        ...(data.choiceResponse
          ? { choiceResponse: data.choiceResponse as object }
          : {}),
        status: "completed",
      },
    }),
    prisma.message.create({
      data: {
        projectId,
        role: "assistant",
        content: data.assistantMessage.answer,
        mode: data.mode,
        interpretation: data.interpretation as object,
        execution: data.execution as object,
        generationId: data.generationId,
        ...(data.assistantMessage.interaction
          ? { interaction: data.assistantMessage.interaction as object }
          : {}),
        status: "completed",
        errorMessage: null,
      },
    }),
  ]);
}

export async function createPendingTurn(
  projectId: string,
  prompt: string,
  choiceResponse?: ChoiceResponse,
): Promise<PendingTurnData> {
  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.message.create({
      data: {
        projectId,
        role: "user",
        content: prompt,
        ...(choiceResponse
          ? { choiceResponse: choiceResponse as object }
          : {}),
        status: "completed",
      },
    }),
    prisma.message.create({
      data: {
        projectId,
        role: "assistant",
        content: "",
        status: "pending",
        errorMessage: null,
      },
    }),
  ]);

  return {
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
  };
}

export async function loadAssistantMessage(
  projectId: string,
  assistantMessageId: string,
  userId = "anonymous",
): Promise<AssistantMessageRecord | null> {
  const message = await prisma.message.findFirst({
    where: {
      id: assistantMessageId,
      projectId,
      role: "assistant",
      project: {
        is: {
          userId,
        },
      },
    },
  });

  if (!message) {
    return null;
  }

  return {
    id: message.id,
    projectId: message.projectId,
    content: message.content,
    status: message.status as MessageStatus,
    interaction: parseAssistantInteraction(message.interaction),
    errorMessage: message.errorMessage,
  };
}

export async function resolveChoiceResponse(
  projectId: string,
  choiceResponse: ChoiceResponseRequest,
  userId = "anonymous",
): Promise<{
  displayPrompt: string;
  effectivePrompt: string;
  choiceResponse: ChoiceResponse;
}> {
  const sourceMessage = await prisma.message.findFirst({
    where: {
      id: choiceResponse.sourceMessageId,
      projectId,
      role: "assistant",
      status: "completed",
      project: {
        is: {
          userId,
        },
      },
    },
  });

  if (!sourceMessage) {
    throw new ConversationInputError("Choice source message not found", 404);
  }

  const interaction = parseAssistantInteraction(sourceMessage.interaction);

  if (!interaction || interaction.type !== "choice") {
    throw new ConversationInputError("Choice source is not selectable");
  }

  if (interaction.id !== choiceResponse.interactionId) {
    throw new ConversationInputError("Choice interaction does not match");
  }

  const selectedOption = interaction.options.find(
    (option) => option.id === choiceResponse.optionId,
  );

  if (!selectedOption) {
    throw new ConversationInputError("Choice option not found");
  }

  const messages = await prisma.message.findMany({
    where: {
      projectId,
      role: "user",
    },
  });

  const existingResponse = messages
    .map((message) => parseChoiceResponse(message.choiceResponse))
    .find(
      (response) =>
        response?.sourceMessageId === choiceResponse.sourceMessageId &&
        response.interactionId === choiceResponse.interactionId,
    );

  if (existingResponse) {
    throw new ConversationInputError("Choice has already been selected", 409);
  }

  return {
    displayPrompt: selectedOption.label,
    effectivePrompt: selectedOption.prompt,
    choiceResponse: {
      sourceMessageId: choiceResponse.sourceMessageId,
      interactionId: choiceResponse.interactionId,
      optionId: selectedOption.id,
      label: selectedOption.label,
      prompt: selectedOption.prompt,
    },
  };
}

export async function markAssistantMessageStreaming(
  assistantMessageId: string,
): Promise<void> {
  await prisma.message.update({
    where: {
      id: assistantMessageId,
    },
    data: {
      status: "streaming",
      errorMessage: null,
    },
  });
}

export async function markAssistantMessageFinalizing(
  assistantMessageId: string,
  content: string,
): Promise<void> {
  await prisma.message.update({
    where: {
      id: assistantMessageId,
    },
    data: {
      content,
      status: "finalizing",
      errorMessage: null,
    },
  });
}

export async function completeAssistantMessage(
  assistantMessageId: string,
  data: Omit<TurnData, "prompt">,
): Promise<void> {
  await prisma.message.update({
    where: {
      id: assistantMessageId,
    },
    data: {
      content: data.assistantMessage.answer,
      mode: data.mode,
      interpretation: data.interpretation as object,
      execution: data.execution as object,
      generationId: data.generationId,
      interaction: data.assistantMessage.interaction
        ? (data.assistantMessage.interaction as object)
        : undefined,
      status: "completed",
      errorMessage: null,
    },
  });
}

export async function failAssistantMessage(
  assistantMessageId: string,
  errorMessage: string,
  content?: string,
): Promise<void> {
  await prisma.message.update({
    where: {
      id: assistantMessageId,
    },
    data: {
      ...(typeof content === "string" ? { content } : {}),
      status: "failed",
      errorMessage,
    },
  });
}

export async function cancelAssistantMessage(
  assistantMessageId: string,
  content = "",
): Promise<void> {
  await prisma.message.update({
    where: {
      id: assistantMessageId,
    },
    data: {
      content,
      status: "cancelled",
      errorMessage: null,
    },
  });
}

export async function updateProjectMetadata(
  projectId: string,
  data: {
    name?: string;
    selectedVariantId?: string | null;
    currentRevisionId?: string | null;
  },
): Promise<void> {
  const nextData: {
    name?: string;
    selectedVariantId?: string | null;
    currentRevisionId?: string | null;
  } = {};

  if (typeof data.name === "string") {
    nextData.name = data.name;
  }

  if ("selectedVariantId" in data) {
    nextData.selectedVariantId = data.selectedVariantId;
  }

  if ("currentRevisionId" in data) {
    nextData.currentRevisionId = data.currentRevisionId;
  }

  if (!Object.keys(nextData).length) {
    return;
  }

  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: nextData,
  });
}
