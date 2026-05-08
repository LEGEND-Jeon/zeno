import { AssistantBubble } from "./assistant-message";

export default function PendingAssistantMessage() {
  return (
    <AssistantBubble>
      <div className="mt-3 flex items-center gap-3 text-[15px] leading-7 text-white/72">
        <span>응답을 준비하고 있어요</span>

        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#80f3c9]/70 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-[#80f3c9]/60 animate-pulse [animation-delay:120ms]" />
          <span className="h-2 w-2 rounded-full bg-[#80f3c9]/50 animate-pulse [animation-delay:240ms]" />
        </span>
      </div>
    </AssistantBubble>
  );
}
