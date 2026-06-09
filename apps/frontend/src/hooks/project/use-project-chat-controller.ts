"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChoiceInteractionOption,
  ProjectDetailResponse,
  ProjectMessage,
} from "@/shared";
import { useProjectAssistantStream } from "@/hooks/project/use-project-assistant-stream";
import {
  updateProjectMessage,
  updateProjectMessages,
} from "@/lib/project-chat/message-cache";
import {
  createTemporaryMessageId,
  getErrorMessage,
  isAssistantActive,
  isTemporaryMessageId,
} from "@/lib/project-chat/message-utils";
import { formatKoreanTimestamp } from "@/lib/format-date";
import {
  cancelProjectAssistantRun,
  submitProjectPrompt,
} from "@/lib/project-api";
import { fetchProjectDetailOrThrow, projectKeys } from "@/lib/project-query";

type SubmitMutationContext = {
  optimisticUserId: string;
  optimisticAssistantId: string;
};

export function useProjectChatController(
  initialProjectDetail: ProjectDetailResponse,
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = initialProjectDetail.project.id;
  const { data: projectDetail } = useQuery<ProjectDetailResponse>({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => fetchProjectDetailOrThrow(projectId),
    initialData: initialProjectDetail,
  });
  const messages = projectDetail.messages;

  console.log("[controller] latestGeneration:", projectDetail.latestGeneration?.generationId ?? null, "variants:", projectDetail.latestGeneration?.variants.length ?? 0);
  const activeAssistantMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) =>
            isAssistantActive(message) && !isTemporaryMessageId(message.id),
        ) ?? null,
    [messages],
  );
  const hasOptimisticPendingAssistant = messages.some(
    (message) =>
      message.role === "assistant" &&
      message.status === "pending" &&
      isTemporaryMessageId(message.id),
  );
  const { deferredAssistantStatuses, commitDeferredAssistantStatus } =
    useProjectAssistantStream({
      projectId,
      messages,
      activeAssistantMessage,
    });

  useEffect(() => {
    if (!messages.length) {
      router.replace("/");
    }
  }, [messages.length, router]);

  const headerTimestamp = useMemo(() => {
    const baseTimestamp =
      messages[0]?.createdAt ?? projectDetail.project.createdAt;
    return formatKoreanTimestamp(baseTimestamp);
  }, [messages, projectDetail.project.createdAt]);

  const submitPromptMutation = useMutation({
    mutationFn: submitProjectPrompt,
    onMutate: async (payload): Promise<SubmitMutationContext> => {
      await queryClient.cancelQueries({
        queryKey: projectKeys.detail(projectId),
      });

      const createdAt = new Date().toISOString();
      const optimisticUserId = createTemporaryMessageId("user");
      const optimisticAssistantId = createTemporaryMessageId("assistant");

      updateProjectMessages(queryClient, projectId, (currentMessages) => [
        ...currentMessages,
        {
          id: optimisticUserId,
          role: "user",
          content: payload.prompt,
          status: "completed",
          mode: undefined,
          generationId: undefined,
          interaction: undefined,
          choiceResponse: payload.choiceResponse
            ? {
                ...payload.choiceResponse,
                label: payload.prompt,
                prompt: payload.prompt,
              }
            : undefined,
          errorMessage: undefined,
          createdAt,
        },
        {
          id: optimisticAssistantId,
          role: "assistant",
          content: "",
          status: "pending",
          mode: undefined,
          generationId: undefined,
          interaction: undefined,
          choiceResponse: undefined,
          errorMessage: undefined,
          createdAt,
        },
      ]);

      return {
        optimisticUserId,
        optimisticAssistantId,
      };
    },
    onSuccess: (response, _payload, context) => {
      if (!context) {
        return;
      }

      updateProjectMessages(queryClient, projectId, (currentMessages) =>
        currentMessages.map((message) => {
          if (message.id === context.optimisticUserId) {
            return {
              ...message,
              id: response.userMessageId,
            };
          }

          if (message.id === context.optimisticAssistantId) {
            return {
              ...message,
              id: response.assistantMessageId,
              status: response.status,
            };
          }

          return message;
        }),
      );

      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
    },
    onError: (error, _payload, context) => {
      if (!context) {
        return;
      }

      updateProjectMessage(
        queryClient,
        projectId,
        context.optimisticAssistantId,
        (message) => ({
          ...message,
          status: "failed",
          errorMessage: getErrorMessage(error),
        }),
      );
    },
  });

  const cancelPromptMutation = useMutation({
    mutationFn: ({ assistantMessageId }: { assistantMessageId: string }) =>
      cancelProjectAssistantRun(projectId, assistantMessageId),
    onError: (error) => {
      console.error(error);
    },
  });
  const isPromptBusy =
    Boolean(activeAssistantMessage) ||
    hasOptimisticPendingAssistant ||
    submitPromptMutation.isPending ||
    cancelPromptMutation.isPending;

  const handleSubmitPrompt = useCallback(
    async (prompt: string, overrideSelectedVariantId?: string) => {
      const selectedVariantId =
        overrideSelectedVariantId ??
        projectDetail.project.selectedVariantId ??
        projectDetail.latestGeneration?.variants[0]?.id;
      const currentRevisionId =
        projectDetail.project.currentRevisionId ??
        projectDetail.latestGeneration?.variants[0]?.revisionId;

      await submitPromptMutation.mutateAsync({
        prompt,
        projectId,
        selectedVariantId: selectedVariantId ?? undefined,
        currentRevisionId: currentRevisionId ?? undefined,
      });
    },
    [
      projectDetail.latestGeneration?.variants,
      projectDetail.project.currentRevisionId,
      projectDetail.project.selectedVariantId,
      projectId,
      submitPromptMutation,
    ],
  );

  const handleCancelPrompt = useCallback(async () => {
    if (!activeAssistantMessage) {
      return;
    }

    await cancelPromptMutation.mutateAsync({
      assistantMessageId: activeAssistantMessage.id,
    });
  }, [activeAssistantMessage, cancelPromptMutation]);

  const handleSubmitChoice = useCallback(
    async (message: ProjectMessage, option: ChoiceInteractionOption) => {
      if (message.interaction?.type !== "choice") {
        return;
      }

      const selectedVariantId =
        projectDetail.project.selectedVariantId ??
        projectDetail.latestGeneration?.variants[0]?.id;
      const currentRevisionId =
        projectDetail.project.currentRevisionId ??
        projectDetail.latestGeneration?.variants[0]?.revisionId;

      const choicePrompt = String(option?.label ?? option?.id ?? "");
      await submitPromptMutation.mutateAsync({
        prompt: choicePrompt,
        projectId,
        selectedVariantId: selectedVariantId ?? undefined,
        currentRevisionId: currentRevisionId ?? undefined,
        choiceResponse: {
          sourceMessageId: message.id,
          interactionId: message.interaction.id,
          optionId: option.id,
        },
      });
    },
    [
      projectDetail.latestGeneration?.variants,
      projectDetail.project.currentRevisionId,
      projectDetail.project.selectedVariantId,
      projectId,
      submitPromptMutation,
    ],
  );

  return {
    messages,
    projectDetail,
    headerTimestamp,
    deferredAssistantStatuses,
    commitDeferredAssistantStatus,
    handleSubmitPrompt,
    handleSubmitChoice,
    handleCancelPrompt,
    isPromptBusy,
    isCancelling: cancelPromptMutation.isPending,
  };
}
