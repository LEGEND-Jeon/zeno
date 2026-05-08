import type { ProjectMessage } from "@zeno/shared";
import AssistantStatusFooter from "./assistant-status-footer";
import AssistantMessage, { AssistantBubble } from "./assistant-message";

const DEFAULT_ERROR_MESSAGE =
  "응답을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";

export default function FailedAssistantMessage({
  message,
}: {
  message: ProjectMessage;
}) {
  if (message.content.trim()) {
    return (
      <AssistantMessage
        message={message}
        footer={
          <AssistantStatusFooter tone="danger">
            {message.errorMessage ?? DEFAULT_ERROR_MESSAGE}
          </AssistantStatusFooter>
        }
      />
    );
  }

  return (
    <AssistantBubble
      labelClassName="text-rose-200"
      bubbleClassName="border-rose-300/20 bg-rose-950/18"
    >
      <p className="mt-3 text-[15px] leading-7 text-white/88">
        {message.errorMessage ?? DEFAULT_ERROR_MESSAGE}
      </p>
    </AssistantBubble>
  );
}
