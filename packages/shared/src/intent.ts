import { z } from "zod";

export const RequestIntentSchema = z.enum([
  "strategy",
  "planning",
  "generate",
  "refine",
]);

export const IntentAnalysisSchema = z.object({
  intent: RequestIntentSchema,
  confidence: z.number().min(0).max(1),
  reason: z.string().default(""),
});

export type RequestIntent = z.infer<typeof RequestIntentSchema>;
export type IntentAnalysis = z.infer<typeof IntentAnalysisSchema>;
