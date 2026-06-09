import type { ProjectDetailResponse } from "@/shared";
import { fetchProjectDetail } from "./project-api";

export const projectKeys = {
  all: ["project"] as const,
  detail: (projectId: string) => [...projectKeys.all, projectId] as const,
};

export async function fetchProjectDetailOrThrow(
  projectId: string,
): Promise<ProjectDetailResponse> {
  const projectDetail = await fetchProjectDetail(projectId);

  if (!projectDetail) {
    throw new Error("Project not found");
  }

  return projectDetail;
}
