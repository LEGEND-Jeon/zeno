import {
  AssistantInteractionSchema,
  ProjectMessageStatusSchema,
} from "@/shared";
import { z } from "zod";
import type { DeferredAssistantStatus } from "./types";

export const ProjectAssistantStreamEventSchema = z.object({
  assistantMessageId: z.string(),
  content: z.string(),
  status: ProjectMessageStatusSchema,
  delta: z.string().optional(),
  interaction: AssistantInteractionSchema.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export type ProjectAssistantStreamEvent = z.infer<
  typeof ProjectAssistantStreamEventSchema
>;

export function parseProjectAssistantStreamEvent(
  rawData: string,
): ProjectAssistantStreamEvent | null {
  try {
    const parsed = ProjectAssistantStreamEventSchema.safeParse(
      JSON.parse(rawData),
    );

    if (!parsed.success) {
      console.error(parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function isDeferredAssistantStatus(
  status: ProjectAssistantStreamEvent["status"],
): status is DeferredAssistantStatus["status"] {
  return (
    status === "finalizing" ||
    status === "completed" ||
    status === "failed" ||
    status === "cancelled"
  );
}
