import type { AssistantInteraction } from "@zeno/shared";
import type { MessageStatus } from "./conversation.service";

export type StreamEventName =
  | "snapshot"
  | "delta"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelled";

export type ActiveRunStatus = Extract<
  MessageStatus,
  "pending" | "streaming" | "finalizing" | "completed" | "failed" | "cancelled"
>;

export interface StreamEventPayload {
  assistantMessageId: string;
  content: string;
  status: ActiveRunStatus;
  delta?: string;
  interaction?: AssistantInteraction | null;
  errorMessage?: string | null;
}

interface ActiveProjectRun {
  assistantMessageId: string;
  projectId: string;
  controller: AbortController;
  content: string;
  status: ActiveRunStatus;
  interaction: AssistantInteraction | null;
  errorMessage: string | null;
  subscribers: Set<(event: StreamEventName, payload: StreamEventPayload) => void>;
}

const activeRuns = new Map<string, ActiveProjectRun>();

function emitRunEvent(
  run: ActiveProjectRun,
  event: StreamEventName,
  payload: Omit<StreamEventPayload, "assistantMessageId">,
) {
  const eventPayload: StreamEventPayload = {
    assistantMessageId: run.assistantMessageId,
    ...payload,
  };

  for (const subscriber of run.subscribers) {
    subscriber(event, eventPayload);
  }
}

export function createProjectRun(
  projectId: string,
  assistantMessageId: string,
): ActiveProjectRun {
  const run: ActiveProjectRun = {
    assistantMessageId,
    projectId,
    controller: new AbortController(),
    content: "",
    status: "pending",
    interaction: null,
    errorMessage: null,
    subscribers: new Set(),
  };

  activeRuns.set(assistantMessageId, run);

  return run;
}

export function getProjectRun(assistantMessageId: string): ActiveProjectRun | null {
  return activeRuns.get(assistantMessageId) ?? null;
}

export function getActiveProjectRunForProject(
  projectId: string,
): ActiveProjectRun | null {
  for (const run of activeRuns.values()) {
    if (run.projectId === projectId) {
      return run;
    }
  }

  return null;
}

export function subscribeToProjectRun(
  assistantMessageId: string,
  subscriber: (event: StreamEventName, payload: StreamEventPayload) => void,
): (() => void) | null {
  const run = activeRuns.get(assistantMessageId);

  if (!run) {
    return null;
  }

  run.subscribers.add(subscriber);

  return () => {
    run.subscribers.delete(subscriber);
  };
}

export function buildProjectRunSnapshot(
  assistantMessageId: string,
): StreamEventPayload | null {
  const run = activeRuns.get(assistantMessageId);

  if (!run) {
    return null;
  }

  return {
    assistantMessageId: run.assistantMessageId,
    content: run.content,
    status: run.status,
    interaction: run.interaction,
    errorMessage: run.errorMessage,
  };
}

export function appendProjectRunDelta(
  assistantMessageId: string,
  delta: string,
): void {
  const run = activeRuns.get(assistantMessageId);

  if (!run) {
    return;
  }

  run.content += delta;
  run.status = "streaming";
  run.errorMessage = null;

  emitRunEvent(run, "delta", {
    content: run.content,
    status: run.status,
    interaction: run.interaction,
    delta,
    errorMessage: null,
  });
}

export function markProjectRunFinalizing(
  assistantMessageId: string,
  content?: string,
): void {
  const run = activeRuns.get(assistantMessageId);

  if (!run) {
    return;
  }

  if (typeof content === "string") {
    run.content = content;
  }

  run.status = "finalizing";
  run.errorMessage = null;

  emitRunEvent(run, "finalizing", {
    content: run.content,
    status: run.status,
    interaction: run.interaction,
    errorMessage: null,
  });
}

export function completeProjectRun(
  assistantMessageId: string,
  content: string,
  interaction: AssistantInteraction | null = null,
): void {
  const run = activeRuns.get(assistantMessageId);

  if (!run) {
    return;
  }

  run.content = content;
  run.status = "completed";
  run.interaction = interaction;
  run.errorMessage = null;

  emitRunEvent(run, "completed", {
    content: run.content,
    status: run.status,
    interaction: run.interaction,
    errorMessage: null,
  });

  activeRuns.delete(assistantMessageId);
}

export function failProjectRun(
  assistantMessageId: string,
  errorMessage: string,
  content: string,
): void {
  const run = activeRuns.get(assistantMessageId);

  if (!run) {
    return;
  }

  run.content = content;
  run.status = "failed";
  run.errorMessage = errorMessage;

  emitRunEvent(run, "failed", {
    content: run.content,
    status: run.status,
    interaction: run.interaction,
    errorMessage,
  });

  activeRuns.delete(assistantMessageId);
}

export function cancelProjectRun(
  assistantMessageId: string,
  content: string,
): void {
  const run = activeRuns.get(assistantMessageId);

  if (!run) {
    return;
  }

  run.content = content;
  run.status = "cancelled";
  run.errorMessage = null;

  emitRunEvent(run, "cancelled", {
    content: run.content,
    status: run.status,
    interaction: run.interaction,
    errorMessage: null,
  });

  activeRuns.delete(assistantMessageId);
}
