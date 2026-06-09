import type { ReactNode } from "react";
import type {
  ChoiceInteractionOption,
  ChoiceResponse,
  ProjectMessage,
} from "@zeno/shared";
import ZenoBadge from "@/components/home/zeno-badge";
import AssistantChoiceInteraction from "./assistant-choice-interaction";
import AssistantMarkdownContent from "./assistant-markdown-content";
import PlanKeywordsCard from "./plan-keywords-card";

type AssistantBubbleProps = {
  children: ReactNode;
  labelClassName?: string;
  bubbleClassName?: string;
};

export function AssistantBubble({
  children,
  labelClassName,
  bubbleClassName,
}: AssistantBubbleProps) {
  return (
    <div className="flex flex-col items-start gap-5">
      <ZenoBadge size={40} className="shrink-0" />

      {bubbleClassName ? (
        <div
          className={`max-w-[720px] rounded-[20px] border px-5 py-4 text-white/84 ${bubbleClassName}`}
        >
          {labelClassName && (
            <p className={`mb-2 text-sm font-semibold ${labelClassName}`}>Zeno</p>
          )}
          {children}
        </div>
      ) : (
        <div className="max-w-[720px] text-white/84">{children}</div>
      )}
    </div>
  );
}

export default function AssistantMessage({
  message,
  footer,
  selectedChoiceResponse,
  isChoiceDisabled,
  onSubmitChoice,
  suppressPlanKeywords = false,
}: {
  message: ProjectMessage;
  footer?: ReactNode;
  selectedChoiceResponse?: ChoiceResponse | null;
  isChoiceDisabled?: boolean;
  onSubmitChoice?: (
    message: ProjectMessage,
    option: ChoiceInteractionOption,
  ) => void;
  suppressPlanKeywords?: boolean;
}) {
  const interaction =
    message.interaction?.type === "choice" ? message.interaction : null;

  const showKeywords =
    !suppressPlanKeywords &&
    message.status === "completed" &&
    message.planKeywords &&
    message.planKeywords.length > 0;

  // 키워드 카드를 "다음 단계" 안내 직전에 삽입
  const [contentBefore, contentAfter] = (() => {
    if (!showKeywords) return [message.content, ""] as const;
    const match = message.content.match(/\n(?=➡️)/);
    if (match?.index !== undefined) {
      return [
        message.content.slice(0, match.index),
        message.content.slice(match.index),
      ] as const;
    }
    return [message.content, ""] as const;
  })();

  return (
    <AssistantBubble>
      <AssistantMarkdownContent content={contentBefore} />
      {showKeywords && <PlanKeywordsCard groups={message.planKeywords!} />}
      {contentAfter && <AssistantMarkdownContent content={contentAfter} />}
      {interaction && onSubmitChoice ? (
        <AssistantChoiceInteraction
          interaction={interaction}
          selectedChoiceResponse={selectedChoiceResponse}
          disabled={isChoiceDisabled}
          onSelect={(option) => onSubmitChoice(message, option)}
        />
      ) : null}
      {footer}
    </AssistantBubble>
  );
}
