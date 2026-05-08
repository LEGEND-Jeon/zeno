import axios from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  // Placeholder for future auth header injection once login is added.
  return config;
});

export function getApiErrorStatus(error: unknown): number | null {
  if (axios.isAxiosError(error)) {
    return error.response?.status ?? null;
  }

  return null;
}

export function toApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "message" in responseData &&
      typeof responseData.message === "string"
    ) {
      return new Error(responseData.message);
    }

    if (error.response?.status) {
      return new Error(`Request failed with status ${error.response.status}`);
    }

    if (error.message.trim()) {
      return new Error(error.message);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown request error");
}
