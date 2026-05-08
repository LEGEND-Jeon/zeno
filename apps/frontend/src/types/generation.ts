export type Variant = {
  id: string;
  name: string;
  summary: string;
  preview: {
    title: string;
    description: string;
    cta: string;
  };
};

export type GenerationResponse = {
  ok: boolean;
  generationId: string;
  projectId: string | null;
  prompt: string;
  variants: Variant[];
};
