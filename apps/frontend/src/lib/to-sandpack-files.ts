import { GeneratedProject } from "@/shared";

type SandpackFiles = Record<
  string,
  | string
  | { code: string; readOnly?: boolean; hidden?: boolean; active?: boolean }
>;

export function toSandpackFiles(project: GeneratedProject): SandpackFiles {
  const result: SandpackFiles = {};

  for (const file of project.files) {
    // Sandpack은 files prop에 경로: 내용 형태를 받음
    result[file.path] = {
      code: file.content,
      readOnly: true,
    };
  }

  // entry 파일은 활성 파일로 잡아주기
  if (
    project.entry &&
    result[project.entry] &&
    typeof result[project.entry] !== "string"
  ) {
    const existing = result[project.entry];
    result[project.entry] = {
      ...(typeof existing === "string" ? { code: existing } : existing),
      active: true,
    };
  }

  return result;
}
