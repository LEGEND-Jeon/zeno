"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProjectMessage } from "@zeno/shared";
import {
  getCachedProjectMessage,
  updateProjectMessage,
} from "@/lib/project-chat/message-cache";
import {
  isDeferredAssistantStatus,
  parseProjectAssistantStreamEvent,
  type ProjectAssistantStreamEvent,
} from "@/lib/project-chat/stream-event";
import type { DeferredAssistantStatus } from "@/lib/project-chat/types";
import { getProjectAssistantStreamUrl } from "@/lib/project-api";
import { projectKeys } from "@/lib/project-query";

type UseProjectAssistantStreamOptions = {
  projectId: string;
  messages: ProjectMessage[];
  activeAssistantMessage: ProjectMessage | null;
};

export function useProjectAssistantStream({
  projectId,
  messages,
  activeAssistantMessage,
}: UseProjectAssistantStreamOptions) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamedAssistantIdRef = useRef<string | null>(null);
  const deferredAssistantStatusesRef = useRef<
    Record<string, DeferredAssistantStatus>
  >({});
  const [deferredAssistantStatuses, setDeferredAssistantStatuses] = useState<
    Record<string, DeferredAssistantStatus>
  >({});

  const closeAssistantStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    streamedAssistantIdRef.current = null;
  }, []);

  const setDeferredAssistantStatus = useCallback(
    (
      assistantMessageId: string,
      nextStatus: DeferredAssistantStatus | null,
    ) => {
      setDeferredAssistantStatuses((currentStatuses) => {
        if (!nextStatus && !currentStatuses[assistantMessageId]) {
          return currentStatuses;
        }

        const nextStatuses = { ...currentStatuses };

        if (nextStatus) {
          nextStatuses[assistantMessageId] = nextStatus;
        } else {
          delete nextStatuses[assistantMessageId];
        }

        deferredAssistantStatusesRef.current = nextStatuses;
        return nextStatuses;
      });
    },
    [],
  );

  const commitDeferredAssistantStatus = useCallback(
    (assistantMessageId: string) => {
      const deferredStatus =
        deferredAssistantStatusesRef.current[assistantMessageId];

      if (!deferredStatus) {
        return;
      }

      setDeferredAssistantStatus(assistantMessageId, null);
      updateProjectMessage(
        queryClient,
        projectId,
        assistantMessageId,
        (message) => ({
          ...message,
          status: deferredStatus.status,
          errorMessage: deferredStatus.errorMessage,
        }),
      );

      if (deferredStatus.shouldInvalidate) {
        console.log("[stream] invalidateQueries (deferred commit)");
        void queryClient.invalidateQueries({
          queryKey: projectKeys.detail(projectId),
        });
      }
    },
    [projectId, queryClient, setDeferredAssistantStatus],
  );

  useEffect(() => {
    const messageIds = new Set(messages.map((message) => message.id));

    setDeferredAssistantStatuses((currentStatuses) => {
      const nextEntries = Object.entries(currentStatuses).filter(([id]) =>
        messageIds.has(id),
      );

      if (nextEntries.length === Object.keys(currentStatuses).length) {
        deferredAssistantStatusesRef.current = currentStatuses;
        return currentStatuses;
      }

      const nextStatuses = Object.fromEntries(nextEntries);
      deferredAssistantStatusesRef.current = nextStatuses;
      return nextStatuses;
    });
  }, [messages]);

  useEffect(() => {
    const assistantMessageId = activeAssistantMessage?.id ?? null;

    if (!assistantMessageId) {
      closeAssistantStream();
      return;
    }

    if (
      streamedAssistantIdRef.current === assistantMessageId &&
      eventSourceRef.current
    ) {
      return;
    }

    closeAssistantStream();

    const nextEventSource = new EventSource(
      getProjectAssistantStreamUrl(projectId, assistantMessageId),
    );

    const applyPayload = (payload: ProjectAssistantStreamEvent) => {
      updateProjectMessage(
        queryClient,
        projectId,
        payload.assistantMessageId,
        (message) => ({
          ...message,
          content: payload.content,
          status: payload.status,
          interaction: payload.interaction ?? message.interaction,
          errorMessage: payload.errorMessage ?? undefined,
        }),
      );
    };

    const deferStatusCommit = (
      payload: ProjectAssistantStreamEvent,
      nextStatus: DeferredAssistantStatus["status"],
      shouldInvalidate: boolean,
    ) => {
      updateProjectMessage(
        queryClient,
        projectId,
        payload.assistantMessageId,
        (message) => ({
          ...message,
          content: payload.content,
          status: "streaming",
          interaction: payload.interaction ?? message.interaction,
          errorMessage: payload.errorMessage ?? undefined,
        }),
      );

      setDeferredAssistantStatus(payload.assistantMessageId, {
        status: nextStatus,
        errorMessage: payload.errorMessage ?? undefined,
        shouldInvalidate,
      });
    };

    const handleFinalizingEvent = (payload: ProjectAssistantStreamEvent) => {
      const currentMessage = getCachedProjectMessage(
        queryClient,
        projectId,
        payload.assistantMessageId,
      );

      if (
        currentMessage &&
        (currentMessage.status === "streaming" ||
          currentMessage.status === "pending")
      ) {
        deferStatusCommit(payload, "finalizing", false);
        return;
      }

      setDeferredAssistantStatus(payload.assistantMessageId, null);
      applyPayload(payload);
    };

    const handleTerminalEvent = (payload: ProjectAssistantStreamEvent) => {
      console.log("[stream] terminal event:", payload.status, payload.assistantMessageId);
      closeAssistantStream();

      if (!isDeferredAssistantStatus(payload.status)) {
        applyPayload(payload);
        return;
      }

      const currentMessage = getCachedProjectMessage(
        queryClient,
        projectId,
        payload.assistantMessageId,
      );

      if (
        currentMessage &&
        (currentMessage.status === "streaming" ||
          currentMessage.status === "pending")
      ) {
        deferStatusCommit(payload, payload.status, true);
        return;
      }

      setDeferredAssistantStatus(payload.assistantMessageId, null);
      applyPayload(payload);
      console.log("[stream] invalidateQueries (non-deferred terminal)");
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
    };

    const registerEvent = (
      eventName: string,
      handler: (payload: ProjectAssistantStreamEvent) => void,
    ) => {
      nextEventSource.addEventListener(eventName, (event) => {
        const payload = parseProjectAssistantStreamEvent(
          (event as MessageEvent<string>).data,
        );

        if (!payload) {
          return;
        }

        handler(payload);
      });
    };

    registerEvent("snapshot", applyPayload);
    registerEvent("delta", applyPayload);
    registerEvent("finalizing", handleFinalizingEvent);
    registerEvent("completed", handleTerminalEvent);
    registerEvent("failed", handleTerminalEvent);
    registerEvent("cancelled", handleTerminalEvent);

    nextEventSource.onerror = () => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      });
    };

    eventSourceRef.current = nextEventSource;
    streamedAssistantIdRef.current = assistantMessageId;

    return () => {
      if (streamedAssistantIdRef.current !== assistantMessageId) {
        return;
      }

      closeAssistantStream();
    };
  }, [
    activeAssistantMessage?.id,
    closeAssistantStream,
    projectId,
    queryClient,
    setDeferredAssistantStatus,
  ]);

  return {
    deferredAssistantStatuses,
    commitDeferredAssistantStatus,
  };
}
