import { z } from "zod";
import { PromptInterpretationSchema } from "./prompt-interpretation";
import { RequestIntentSchema } from "./intent";
import { VariantBriefSchema, SectionTypeSchema } from "./variant-brief";
import { AssistantInteractionSchema } from "./chat-interaction";

export const AssistantMessageSchema = z.object({
  title: z.string(),
  summary: z.string(),
  bullets: z.array(z.string()).default([]),

  // 실제 채팅창에 보여줄 본문
  answer: z.string(),

  // 있으면 좋은 추가 행동 유도
  nextActions: z.array(z.string()).default([]),

  // 사용자의 명시적인 선택이 필요할 때 프론트가 버튼으로 렌더링할 구조화 데이터
  interaction: AssistantInteractionSchema.nullable().default(null),
});

export const StrategyPlanSchema = z.object({
  recommendations: z.array(z.string()).default([]),
  styleKeywords: z.array(z.string()).default([]),
  moodKeywords: z.array(z.string()).default([]),
  mustAvoid: z.array(z.string()).default([]),
});

export const PlanningPlanSchema = z.object({
  recommendedSections: z.array(z.string()).default([]),
  contentHierarchy: z.array(z.string()).default([]),
  layoutNotes: z.array(z.string()).default([]),
  planOptions: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        sections: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export const RefinePlanSchema = z.object({
  targetSectionIds: z.array(SectionTypeSchema).default([]),
  patchIntent: z.enum(["content", "style", "layout", "component-replace"]),
  changeSummary: z.array(z.string()).default([]),
});

export const PlannerExecutionSchema = z.object({
  strategyPlan: StrategyPlanSchema.nullable(),
  planningPlan: PlanningPlanSchema.nullable(),
  variantBriefs: z.array(VariantBriefSchema).length(4).nullable(),
  defaultSelectedVariantId: z.string().nullable(),
  refinePlan: RefinePlanSchema.nullable(),
});

export const PlannerResponseSchema = z.object({
  mode: RequestIntentSchema,
  interpretation: PromptInterpretationSchema,
  assistantMessage: AssistantMessageSchema,
  execution: PlannerExecutionSchema,
});

export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export type StrategyPlan = z.infer<typeof StrategyPlanSchema>;
export type PlanningPlan = z.infer<typeof PlanningPlanSchema>;
export type RefinePlan = z.infer<typeof RefinePlanSchema>;
export type PlannerExecution = z.infer<typeof PlannerExecutionSchema>;
export type PlannerResponse = z.infer<typeof PlannerResponseSchema>;
