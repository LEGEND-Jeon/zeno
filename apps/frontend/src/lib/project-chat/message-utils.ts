import type { ProjectMessage } from "@zeno/shared";

export function createTemporaryMessageId(role: "user" | "assistant") {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `temp-${role}-${suffix}`;
}

export function isTemporaryMessageId(messageId: string) {
  return messageId.startsWith("temp-");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "응답을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
}

export function isAssistantActive(message: ProjectMessage) {
  return (
    message.role === "assistant" &&
    (message.status === "pending" ||
      message.status === "streaming" ||
      message.status === "finalizing")
  );
}
