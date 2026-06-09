import { useEffect, type ReactNode } from "react";
import type { ProjectMessage } from "@/shared";
import { useStreamingText } from "@/hooks/project/use-streaming-text";
import type { DeferredAssistantStatus } from "@/lib/project-chat/types";
import AssistantMarkdownContent from "./assistant-markdown-content";
import { AssistantBubble } from "./assistant-message";

export default function StreamingAssistantMessage({
  message,
  footer,
  deferredStatus,
  onTypingComplete,
}: {
  message: ProjectMessage;
  footer?: ReactNode;
  deferredStatus?: DeferredAssistantStatus;
  onTypingComplete?: (assistantMessageId: string) => void;
}) {
  const { visibleContent, isDrained } = useStreamingText(message.content);

  useEffect(() => {
    if (!deferredStatus || !onTypingComplete || !isDrained) {
      return;
    }

    if (visibleContent !== message.content) {
      return;
    }

    onTypingComplete(message.id);
  }, [
    deferredStatus,
    isDrained,
    message.content,
    message.id,
    onTypingComplete,
    visibleContent,
  ]);

  return (
    <AssistantBubble>
      <AssistantMarkdownContent content={visibleContent} />
      {footer}
    </AssistantBubble>
  );
}
