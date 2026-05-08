import { z } from "zod";

export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const GeneratedFilesSchema = z.object({
  files: z.array(GeneratedFileSchema).min(0),
});

export type GeneratedFile = z.infer<typeof GeneratedFileSchema>;
export type GeneratedFiles = z.infer<typeof GeneratedFilesSchema>;
