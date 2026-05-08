import { z } from "zod";

export const PromptInterpretationSchema = z.object({
  productType: z.string().default("web page"),
  targetAudience: z.array(z.string()).default([]),

  userStylePhrases: z.array(z.string()).default([]),
  styleKeywords: z.array(z.string()).default([]),
  moodKeywords: z.array(z.string()).default([]),
  colorKeywords: z.array(z.string()).default([]),
  layoutHints: z.array(z.string()).default([]),

  requiredSections: z.array(z.string()).default([]),
  optionalSections: z.array(z.string()).default([]),

  mustAvoid: z.array(z.string()).default([]),
  aestheticNotes: z.string().default(""),

  summary: z.string(),
});

export type PromptInterpretation = z.infer<typeof PromptInterpretationSchema>;
