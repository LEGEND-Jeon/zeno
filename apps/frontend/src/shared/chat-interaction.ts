import { z } from "zod";

export const ChoiceInteractionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  prompt: z.string().min(1),
});

export const AssistantChoiceInteractionSchema = z.object({
  type: z.literal("choice"),
  id: z.string().min(1),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  options: z.array(ChoiceInteractionOptionSchema).min(2).max(4),
});

export const AssistantInteractionSchema = AssistantChoiceInteractionSchema;

export const ChoiceResponseRequestSchema = z.object({
  sourceMessageId: z.string().min(1),
  interactionId: z.string().min(1),
  optionId: z.string().min(1),
});

export const ChoiceResponseSchema = ChoiceResponseRequestSchema.extend({
  label: z.string().min(1),
  prompt: z.string().min(1),
});

export type ChoiceInteractionOption = z.infer<
  typeof ChoiceInteractionOptionSchema
>;
export type AssistantChoiceInteraction = z.infer<
  typeof AssistantChoiceInteractionSchema
>;
export type AssistantInteraction = z.infer<typeof AssistantInteractionSchema>;
export type ChoiceResponseRequest = z.infer<typeof ChoiceResponseRequestSchema>;
export type ChoiceResponse = z.infer<typeof ChoiceResponseSchema>;
