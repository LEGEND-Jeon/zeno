import {
  ProjectCancelResponseSchema,
  GenerationsResponseSchema,
  ProjectDetailResponseSchema,
  ProjectSubmitResponseSchema,
  type ProjectCancelResponse,
  type GenerationsResponse,
  type ProjectDetailResponse,
  type ProjectSubmitResponse,
  type PromptRequest,
} from "@/shared";
import {
  API_BASE_URL,
  apiClient,
  getApiErrorStatus,
  toApiError,
} from "./api-client";

export async function fetchProjectDetail(
  projectId: string,
): Promise<ProjectDetailResponse | null> {
  try {
    const response = await apiClient.get(`/projects/${projectId}`);
    return ProjectDetailResponseSchema.parse(response.data);
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }

    throw toApiError(error);
  }
}

export async function requestGeneration(
  payload: PromptRequest,
): Promise<GenerationsResponse> {
  try {
    const response = await apiClient.post("/generations", payload);
    return GenerationsResponseSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function submitProjectPrompt(
  payload: PromptRequest,
): Promise<ProjectSubmitResponse> {
  try {
    console.log("[API] POST /projects/submit →", payload);
    const response = await apiClient.post("/projects/submit", payload);
    console.log("[API] POST /projects/submit ← status:", response.status, response.data);
    return ProjectSubmitResponseSchema.parse(response.data);
  } catch (error) {
    console.error("[API] POST /projects/submit error:", error);
    throw toApiError(error);
  }
}

export function getProjectAssistantStreamUrl(
  projectId: string,
  assistantMessageId: string,
): string {
  return `${API_BASE_URL}/projects/${projectId}/messages/${assistantMessageId}/stream`;
}

export async function cancelProjectAssistantRun(
  projectId: string,
  assistantMessageId: string,
): Promise<ProjectCancelResponse> {
  try {
    const response = await apiClient.post(
      `/projects/${projectId}/messages/${assistantMessageId}/cancel`,
    );
    return ProjectCancelResponseSchema.parse(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}
