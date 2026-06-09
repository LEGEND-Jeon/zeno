import { z } from "zod";
import { VariantBriefSchema } from "./variant-brief";
import { GeneratedProjectSchema } from "./generated-project";
import { ChoiceResponseRequestSchema } from "./chat-interaction";

export const UiMapItemSchema = z.object({
  sectionId: z.string(),
  label: z.string(),
  filePath: z.string(),
});

export const PromptRequestSchema = z.object({
  prompt: z.string().min(1),

  // 프로젝트 식별자 (없으면 서버에서 신규 생성)
  projectId: z.string().optional(),

  // refine 시 어떤 variant를 수정할지
  selectedVariantId: z.string().optional(),

  // undo/버전 복원 시 기준 revision
  currentRevisionId: z.string().optional(),

  // assistant choice interaction에서 선택한 값을 제출할 때 사용
  choiceResponse: ChoiceResponseRequestSchema.optional(),
});

export const VariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),

  // generate 직후 각 variant의 첫 revision
  revisionId: z.string(),

  brief: VariantBriefSchema,
  project: GeneratedProjectSchema,
  uiMap: z.array(UiMapItemSchema).default([]),
});

export type UiMapItem = z.infer<typeof UiMapItemSchema>;
export type PromptRequest = z.infer<typeof PromptRequestSchema>;
export type Variant = z.infer<typeof VariantSchema>;
