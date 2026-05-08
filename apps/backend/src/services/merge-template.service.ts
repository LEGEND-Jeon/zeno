import type { GeneratedFile, GeneratedProject } from "@zeno/shared";
import { loadTemplateFiles } from "./load-template.service";

export function generateProjectFromFiles(
  generatedFiles: GeneratedFile[],
): GeneratedProject {
  const templateFiles = loadTemplateFiles();

  const merged = new Map<string, string>();

  for (const file of templateFiles) {
    merged.set(file.path, file.content);
  }

  for (const file of generatedFiles) {
    merged.set(file.path, file.content);
  }

  return {
    template: "react-vite-shadcn",
    entry: "/src/App.tsx",
    files: Array.from(merged.entries()).map(([path, content]) => ({
      path,
      content,
    })),
  };
}
