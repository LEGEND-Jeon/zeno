import { z } from "zod";
import { RequestIntentSchema } from "./intent";
import { VariantSchema } from "./api-types";
import {
  AssistantInteractionSchema,
  ChoiceResponseSchema,
} from "./chat-interaction";

export const ProjectMessageStatusSchema = z.enum([
  "pending",
  "streaming",
  "finalizing",
  "completed",
  "failed",
  "cancelled",
]);

export const PlanKeywordGroupSchema = z.object({
  label: z.string(),
  color: z.enum(["yellow", "blue", "green", "pink"]),
  items: z.array(z.string()),
});

export const ProjectMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  status: ProjectMessageStatusSchema,
  mode: RequestIntentSchema.nullable().optional(),
  generationId: z.string().nullable().optional(),
  interaction: AssistantInteractionSchema.nullable().optional(),
  choiceResponse: ChoiceResponseSchema.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  planKeywords: z.array(PlanKeywordGroupSchema).optional(),
  createdAt: z.string(),
});

export const ProjectSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  selectedVariantId: z.string().nullable().optional(),
  currentRevisionId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProjectLatestGenerationSchema = z.object({
  generationId: z.string(),
  variants: z.array(VariantSchema),
});

export const ProjectDetailResponseSchema = z.object({
  ok: z.literal(true),
  project: ProjectSummarySchema,
  messages: z.array(ProjectMessageSchema),
  latestGeneration: ProjectLatestGenerationSchema.nullable(),
});

export const ProjectSubmitResponseSchema = z.object({
  ok: z.literal(true),
  projectId: z.string(),
  userMessageId: z.string(),
  assistantMessageId: z.string(),
  status: z.literal("pending"),
});

export const ProjectCancelResponseSchema = z.object({
  ok: z.literal(true),
  assistantMessageId: z.string(),
  status: ProjectMessageStatusSchema,
});

export type PlanKeywordGroup = z.infer<typeof PlanKeywordGroupSchema>;
export type ProjectMessage = z.infer<typeof ProjectMessageSchema>;
export type ProjectMessageStatus = z.infer<typeof ProjectMessageStatusSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectLatestGeneration = z.infer<
  typeof ProjectLatestGenerationSchema
>;
export type ProjectDetailResponse = z.infer<typeof ProjectDetailResponseSchema>;
export type ProjectSubmitResponse = z.infer<typeof ProjectSubmitResponseSchema>;
export type ProjectCancelResponse = z.infer<typeof ProjectCancelResponseSchema>;
