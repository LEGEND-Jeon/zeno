import { Fragment } from "react";
import type {
  ChoiceInteractionOption,
  ChoiceResponse,
  ProjectMessage,
  Variant,
} from "@/shared";
import type { DeferredAssistantStatus } from "@/lib/project-chat/types";
import AssistantMessage from "./assistant-message";
import AssistantStatusFooter from "./assistant-status-footer";
import FailedAssistantMessage from "./failed-assistant-message";
import PendingAssistantMessage from "./pending-assistant-message";
import StreamingAssistantMessage from "./streaming-assistant-message";
import UserMessage from "./user-message";
import VariantCardGrid from "./variant-card-grid";

type ProjectMessageListProps = {
  messages: ProjectMessage[];
  deferredAssistantStatuses: Record<string, DeferredAssistantStatus>;
  onTypingComplete: (assistantMessageId: string) => void;
  onSubmitChoice: (
    message: ProjectMessage,
    option: ChoiceInteractionOption,
  ) => void;
  isChoiceDisabled: boolean;
  bottomPadding: number;
  variants: Variant[] | null;
  latestGenerationId: string | null;
  localSelectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
  onReselectVariant: () => void;
};

function StreamingFooter() {
  return (
    <AssistantStatusFooter>
      <span className="inline-flex items-center gap-2">
        <span>답변을 이어 쓰고 있어요</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#80f3c9]/70 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#80f3c9]/60 animate-pulse [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#80f3c9]/50 animate-pulse [animation-delay:240ms]" />
        </span>
      </span>
    </AssistantStatusFooter>
  );
}

function renderMessage(
  message: ProjectMessage,
  deferredAssistantStatuses: Record<string, DeferredAssistantStatus>,
  onTypingComplete: (assistantMessageId: string) => void,
  selectedChoiceResponse: ChoiceResponse | null,
  onSubmitChoice: (
    message: ProjectMessage,
    option: ChoiceInteractionOption,
  ) => void,
  isChoiceDisabled: boolean,
  suppressPlanKeywords: boolean,
) {
  if (message.role === "user") {
    return <UserMessage key={message.id} message={message} />;
  }

  if (message.status === "pending") {
    return <PendingAssistantMessage key={message.id} />;
  }

  if (message.status === "streaming") {
    return (
      <StreamingAssistantMessage
        key={message.id}
        message={message}
        deferredStatus={deferredAssistantStatuses[message.id]}
        onTypingComplete={onTypingComplete}
        footer={<StreamingFooter />}
      />
    );
  }

  if (message.status === "finalizing") {
    return (
      <AssistantMessage
        key={message.id}
        message={message}
        selectedChoiceResponse={selectedChoiceResponse}
        isChoiceDisabled={isChoiceDisabled}
        onSubmitChoice={onSubmitChoice}
        suppressPlanKeywords={suppressPlanKeywords}
        footer={
          <AssistantStatusFooter>
            답변은 준비됐고 결과를 마무리하고 있어요.
          </AssistantStatusFooter>
        }
      />
    );
  }

  if (message.status === "cancelled") {
    return (
      <AssistantMessage
        key={message.id}
        message={message}
        selectedChoiceResponse={selectedChoiceResponse}
        isChoiceDisabled={isChoiceDisabled}
        onSubmitChoice={onSubmitChoice}
        suppressPlanKeywords={suppressPlanKeywords}
        footer={
          <AssistantStatusFooter tone="warning">
            응답 생성을 취소했어요.
          </AssistantStatusFooter>
        }
      />
    );
  }

  if (message.status === "failed") {
    return <FailedAssistantMessage key={message.id} message={message} />;
  }

  return (
    <AssistantMessage
      key={message.id}
      message={message}
      selectedChoiceResponse={selectedChoiceResponse}
      isChoiceDisabled={isChoiceDisabled}
      onSubmitChoice={onSubmitChoice}
      suppressPlanKeywords={suppressPlanKeywords}
    />
  );
}

export default function ProjectMessageList({
  messages,
  deferredAssistantStatuses,
  onTypingComplete,
  onSubmitChoice,
  isChoiceDisabled,
  bottomPadding,
  variants,
  latestGenerationId,
  localSelectedVariantId,
  onSelectVariant,
  onReselectVariant,
}: ProjectMessageListProps) {
  const firstKeywordsMessageId = messages.find(
    (m) => m.role === "assistant" && m.planKeywords && m.planKeywords.length > 0,
  )?.id ?? null;

  function getSelectedChoiceResponse(message: ProjectMessage) {
    const interaction =
      message.interaction?.type === "choice" ? message.interaction : null;

    if (!interaction) {
      return null;
    }

    return (
      messages.find(
        (candidateMessage) =>
          candidateMessage.role === "user" &&
          candidateMessage.choiceResponse?.sourceMessageId === message.id &&
          candidateMessage.choiceResponse.interactionId === interaction.id,
      )?.choiceResponse ?? null
    );
  }

  return (
    <div
      className="mx-auto flex max-w-[780px] flex-col gap-8"
      style={{
        paddingBottom: `${bottomPadding}px`,
      }}
    >
      {messages.map((message) => {
        const suppressPlanKeywords =
          message.id !== firstKeywordsMessageId;

        const rendered = renderMessage(
          message,
          deferredAssistantStatuses,
          onTypingComplete,
          getSelectedChoiceResponse(message),
          onSubmitChoice,
          isChoiceDisabled,
          suppressPlanKeywords,
        );

        const isLatestGenerateCompleted =
          message.role === "assistant" &&
          message.status === "completed" &&
          message.mode === "generate" &&
          !!latestGenerationId &&
          message.generationId === latestGenerationId;

        if (isLatestGenerateCompleted && variants && variants.length > 0) {
          return (
            <Fragment key={message.id}>
              {rendered}
              <VariantCardGrid
                variants={variants}
                selectedVariantId={localSelectedVariantId}
                onSelect={onSelectVariant}
                onReselect={onReselectVariant}
              />
            </Fragment>
          );
        }

        return rendered;
      })}
    </div>
  );
}
