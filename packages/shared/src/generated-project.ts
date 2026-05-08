import { z } from "zod";
import { GeneratedFileSchema } from "./generated-files";

export const GeneratedProjectSchema = z.object({
  template: z.literal("react-vite-shadcn"),
  entry: z.string(),
  files: z.array(GeneratedFileSchema).min(1),
});

export type GeneratedProject = z.infer<typeof GeneratedProjectSchema>;
