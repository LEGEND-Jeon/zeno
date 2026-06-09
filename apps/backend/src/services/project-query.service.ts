import {
  AssistantInteractionSchema,
  ChoiceResponseSchema,
  PlannerExecutionSchema,
  type PlanKeywordGroup,
  type ProjectDetailResponse,
} from "@zeno/shared";
import { store } from "../lib/store";
import { loadLatestGeneration } from "./project-store.service";

function extractPlanKeywords(mode: string | null, execution: unknown): PlanKeywordGroup[] | undefined {
  if (!execution || (mode !== "strategy" && mode !== "planning")) return undefined;

  const parsed = PlannerExecutionSchema.safeParse(execution);
  if (!parsed.success) return undefined;

  const groups: PlanKeywordGroup[] = [];
  const { strategyPlan } = parsed.data;

  if (strategyPlan) {
    if (strategyPlan.moodKeywords.length) {
      groups.push({ label: "핵심가치", color: "yellow", items: strategyPlan.moodKeywords.slice(0, 3) });
    }
    if (strategyPlan.styleKeywords.length) {
      groups.push({ label: "스타일", color: "blue", items: strategyPlan.styleKeywords.slice(0, 3) });
    }
    if (strategyPlan.recommendations.length) {
      groups.push({ label: "형태", color: "green", items: strategyPlan.recommendations.slice(0, 3) });
    }
    if (strategyPlan.mustAvoid.length) {
      groups.push({ label: "컬러", color: "pink", items: strategyPlan.mustAvoid.slice(0, 3) });
    }
  }

  return groups.length > 0 ? groups : undefined;
}

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
  const project = store.project.findFirst({ id: projectId, userId });

  if (!project) return null;

  const msgs = store.message.findMany({ projectId }, "asc");
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
    messages: msgs.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      status: message.status as ProjectDetailResponse["messages"][number]["status"],
      mode: message.mode as ProjectDetailResponse["messages"][number]["mode"],
      generationId: message.generationId,
      interaction: parseAssistantInteraction(message.interaction),
      choiceResponse: parseChoiceResponse(message.choiceResponse),
      errorMessage: message.errorMessage,
      planKeywords: extractPlanKeywords(message.mode, message.execution),
      createdAt: message.createdAt.toISOString(),
    })),
    latestGeneration,
  };
}
