import { z } from "zod";

export const SectionTypeSchema = z.enum([
  // web sections
  "hero",
  "logo-strip",
  "feature-grid",
  "testimonial",
  "pricing",
  "faq",
  "cta",
  "stats",
  "comparison",
  "showcase",
  "process",
  "contact-form",
  // app sections
  "home-screen",
  "onboarding",
  "tab-bar",
  "card-feed",
  "profile",
  "settings",
  "dashboard",
]);

export const CompositionStyleSchema = z.enum([
  "structured",
  "dynamic",
  "minimal",
  "immersive",
]);

export const VisualToneSchema = z.enum([
  "restrained",
  "bold",
  "warm",
  "technical",
  "refined",
]);

export const BrandCharacterSchema = z.enum([
  "trustworthy",
  "progressive",
  "playful",
  "refined",
  "confident",
]);

export const SectionPlanSchema = z.object({
  type: SectionTypeSchema,
  emphasis: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().default(""),
});

export const VariantBriefSchema = z.object({
  variantId: z.enum(["A", "B", "C", "D"]),

  productType: z.enum(["web", "app"]).default("web"),
  navPattern: z.enum(["header", "bottom-tab"]).default("header"),

  compositionStyle: CompositionStyleSchema,
  visualTone: VisualToneSchema,
  brandCharacter: BrandCharacterSchema,

  density: z.enum(["compact", "balanced", "spacious"]),
  colorStyle: z.enum(["neutral", "brand", "dark", "soft"]),

  sections: z.array(SectionPlanSchema).min(3),

  styleKeywords: z.array(z.string()).default([]),
  moodKeywords: z.array(z.string()).default([]),
  colorKeywords: z.array(z.string()).default([]),
  userStylePhrases: z.array(z.string()).default([]),

  aestheticNotes: z.string().default(""),
  mustAvoid: z.array(z.string()).default([]),

  summary: z.string(),
});

export const VariantBriefListSchema = z.object({
  variants: z.array(VariantBriefSchema).length(4),
});

export type SectionType = z.infer<typeof SectionTypeSchema>;
export type SectionPlan = z.infer<typeof SectionPlanSchema>;
export type VariantBrief = z.infer<typeof VariantBriefSchema>;
