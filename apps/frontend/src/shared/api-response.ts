import { z } from "zod";
import { RequestIntentSchema } from "./intent";
import { PromptInterpretationSchema } from "./prompt-interpretation";
import { GeneratedProjectSchema } from "./generated-project";
import { UiMapItemSchema, VariantSchema } from "./api-types";
import { AssistantMessageSchema } from "./planner-schema";

const BaseGenerationsResponseSchema = z.object({
  ok: z.literal(true),
  mode: RequestIntentSchema,
  projectId: z.string(),
  prompt: z.string(),
  interpretation: PromptInterpretationSchema,
  assistantMessage: AssistantMessageSchema,

  // 프론트가 현재 작업 상태를 이어갈 최소값
  selectedVariantId: z.string().optional(),
  currentRevisionId: z.string().optional(),
});

export const StrategyResponseSchema = BaseGenerationsResponseSchema.extend({
  mode: z.literal("strategy"),
  strategy: z.object({
    recommendations: z.array(z.string()).default([]),
    styleKeywords: z.array(z.string()).default([]),
    moodKeywords: z.array(z.string()).default([]),
    mustAvoid: z.array(z.string()).default([]),
  }),
});

export const PlanningResponseSchema = BaseGenerationsResponseSchema.extend({
  mode: z.literal("planning"),
  planning: z.object({
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
  }),
});

export const GenerateResponseSchema = BaseGenerationsResponseSchema.extend({
  mode: z.literal("generate"),
  generationId: z.string(),
  variants: z.array(VariantSchema).length(4),
});

export const RefineResponseSchema = BaseGenerationsResponseSchema.extend({
  mode: z.literal("refine"),

  // 어떤 안을 기준으로 수정했는지
  sourceVariantId: z.string(),
  sourceRevisionId: z.string().optional(),

  changedFiles: z.array(z.string()).default([]),
  patchSummary: z.array(z.string()).default([]),

  // 수정 후 최신 결과물
  project: GeneratedProjectSchema,
  uiMap: z.array(UiMapItemSchema).default([]),
});

export const GenerationsResponseSchema = z.discriminatedUnion("mode", [
  StrategyResponseSchema,
  PlanningResponseSchema,
  GenerateResponseSchema,
  RefineResponseSchema,
]);

export type StrategyResponse = z.infer<typeof StrategyResponseSchema>;
export type PlanningResponse = z.infer<typeof PlanningResponseSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
export type RefineResponse = z.infer<typeof RefineResponseSchema>;
export type GenerationsResponse = z.infer<typeof GenerationsResponseSchema>;
