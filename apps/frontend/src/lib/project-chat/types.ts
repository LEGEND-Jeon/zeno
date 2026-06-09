import type { ProjectMessage } from "@/shared";

export type DeferredAssistantStatus = {
  status: Extract<
    ProjectMessage["status"],
    "finalizing" | "completed" | "failed" | "cancelled"
  >;
  errorMessage?: string;
  shouldInvalidate: boolean;
};
