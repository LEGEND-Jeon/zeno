import type { GeneratedFile } from "@zeno/shared";

export const toSectionId = (fileName: string): string =>
  fileName
    .replace(/Section\.tsx$/, "")
    .replace(/\.tsx$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

export const buildUiMap = (files: GeneratedFile[]) =>
  files
    .filter(
      (f) =>
        f.path.startsWith("/src/generated/sections/") &&
        f.path.endsWith(".tsx"),
    )
    .map((f) => {
      const fileName = f.path.split("/").pop() ?? "";
      return {
        sectionId: toSectionId(fileName),
        label: fileName.replace(".tsx", ""),
        filePath: f.path,
      };
    });
