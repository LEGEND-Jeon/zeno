import type { ReactNode } from "react";
import type {
  ChoiceInteractionOption,
  ChoiceResponse,
  ProjectMessage,
} from "@zeno/shared";
import ZenoMark from "@/components/home/zeno-mark";
import AssistantChoiceInteraction from "./assistant-choice-interaction";
import AssistantMarkdownContent from "./assistant-markdown-content";

type AssistantBubbleProps = {
  children: ReactNode;
  labelClassName?: string;
  bubbleClassName?: string;
};

export function AssistantBubble({
  children,
  labelClassName = "text-[#80f3c9]",
  bubbleClassName = "border-white/8 bg-black/18",
}: AssistantBubbleProps) {
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      <ZenoMark className="mt-1 h-8 w-8 shrink-0" />

      <div
        className={`max-w-[720px] rounded-[30px] border px-5 py-5 text-white/84 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-[6px] sm:px-6 ${bubbleClassName}`}
      >
        <p className={`text-sm font-semibold ${labelClassName}`}>Zeno</p>
        {children}
      </div>
    </div>
  );
}

export default function AssistantMessage({
  message,
  footer,
  selectedChoiceResponse,
  isChoiceDisabled,
  onSubmitChoice,
}: {
  message: ProjectMessage;
  footer?: ReactNode;
  selectedChoiceResponse?: ChoiceResponse | null;
  isChoiceDisabled?: boolean;
  onSubmitChoice?: (
    message: ProjectMessage,
    option: ChoiceInteractionOption,
  ) => void;
}) {
  const interaction =
    message.interaction?.type === "choice" ? message.interaction : null;

  return (
    <AssistantBubble>
      <AssistantMarkdownContent content={message.content} />
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
