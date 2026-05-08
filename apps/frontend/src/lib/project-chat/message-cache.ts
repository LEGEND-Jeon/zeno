import type { QueryClient } from "@tanstack/react-query";
import type { ProjectDetailResponse, ProjectMessage } from "@zeno/shared";
import { projectKeys } from "@/lib/project-query";

export function updateProjectMessages(
  queryClient: QueryClient,
  projectId: string,
  updater: (messages: ProjectMessage[]) => ProjectMessage[],
) {
  queryClient.setQueryData<ProjectDetailResponse>(
    projectKeys.detail(projectId),
    (currentProjectDetail) => {
      if (!currentProjectDetail) {
        return currentProjectDetail;
      }

      return {
        ...currentProjectDetail,
        messages: updater(currentProjectDetail.messages),
      };
    },
  );
}

export function updateProjectMessage(
  queryClient: QueryClient,
  projectId: string,
  messageId: string,
  updater: (message: ProjectMessage) => ProjectMessage,
) {
  updateProjectMessages(queryClient, projectId, (messages) =>
    messages.map((message) =>
      message.id === messageId ? updater(message) : message,
    ),
  );
}

export function getCachedProjectMessage(
  queryClient: QueryClient,
  projectId: string,
  messageId: string,
) {
  return queryClient
    .getQueryData<ProjectDetailResponse>(projectKeys.detail(projectId))
    ?.messages.find((message) => message.id === messageId);
}
