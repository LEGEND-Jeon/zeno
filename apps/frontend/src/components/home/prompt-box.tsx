"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProjectPrompt } from "@/lib/project-api";

type PromptBoxProps = {
  onSubmitPrompt?: (prompt: string) => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
  isBusy?: boolean;
  isCancelling?: boolean;
  submitHref?: string;
  variant?: "hero" | "chat";
};

const PromptBox = ({
  onSubmitPrompt,
  onCancel,
  isBusy = false,
  isCancelling = false,
  submitHref = "/project",
  variant = "hero",
}: PromptBoxProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isChatVariant = variant === "chat";
  const hasPrompt = prompt.trim().length > 0;
  const minRows = isChatVariant ? 1 : 2;
  const isLoading = isSubmitting || isCancelling;
  const canSubmit = hasPrompt && !isLoading && !isBusy;
  const canCancel = Boolean(onCancel) && isBusy && !isLoading;

  useEffect(() => {
    syncTextareaHeight(textareaRef.current, minRows);
  }, [minRows, prompt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPrompt = prompt.trim();
    if (!nextPrompt || isLoading || isBusy) return;

    try {
      setIsSubmitting(true);

      if (onSubmitPrompt) {
        await onSubmitPrompt(nextPrompt);
        setPrompt("");
        return;
      }

      const response = await submitProjectPrompt({ prompt: nextPrompt });
      router.push(`${submitHref}/${response.projectId}`);
      setPrompt("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!onCancel || !canCancel) {
      return;
    }

    try {
      await onCancel();
    } catch (error) {
      console.error(error);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isBusy) {
      return;
    }

    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  if (isChatVariant) {
    return (
      <form
        onSubmit={handleSubmit}
        className="w-full drop-shadow-[0_0_10px_rgba(255,255,255,0.08)]"
      >
        {/* 텍스트 입력 영역 */}
        <div className="rounded-tl-[20px] rounded-tr-[20px] bg-[#f0f0f0] px-5 py-5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full resize-none overflow-y-hidden bg-transparent text-[16px] leading-[1.3] text-[#1d1d1d] outline-none placeholder:text-[#808080]"
            placeholder="무엇이든 물어보세요. Zeno가 도와드려요."
          />
        </div>

        {/* 액션 바 */}
        <div className="flex h-16 items-center justify-between rounded-bl-[20px] rounded-br-[20px] bg-[#f0f0f0] px-5 py-3">
          <button
            type="button"
            aria-label="파일 추가"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[1.25rem] leading-none text-neutral-500 shadow-[0_0_5px_rgba(0,0,0,0.12)] transition hover:bg-neutral-50"
          >
            +
          </button>

          <button
            type={canCancel ? "button" : "submit"}
            aria-label={canCancel ? "취소" : "전송"}
            onClick={canCancel ? handleCancel : undefined}
            disabled={!canCancel && !canSubmit}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg text-white transition ${
              canCancel
                ? "cursor-pointer bg-rose-500 hover:bg-rose-600"
                : canSubmit
                  ? "cursor-pointer bg-[#1d1d1d] hover:bg-black"
                  : "cursor-not-allowed bg-[#1d1d1d]/40"
            }`}
          >
            {isLoading ? "…" : canCancel ? "■" : "↑"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-[760px] rounded-[28px] border border-black/5 bg-white/95 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl"
    >
      <div className="flex flex-col">
        <textarea
          ref={textareaRef}
          rows={minRows}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none overflow-y-hidden bg-transparent pb-3 pl-1 pr-1 pt-1 text-[15px] leading-7 text-neutral-900 outline-none placeholder:text-neutral-400"
          placeholder="무엇이든 물어보세요. Zeno가 도와드려요."
        />

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            aria-label="파일 추가"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-[1.5rem] leading-none text-neutral-500 shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition hover:bg-neutral-50"
          >
            +
          </button>

          <button
            type={canCancel ? "button" : "submit"}
            aria-label={canCancel ? "취소" : "전송"}
            onClick={canCancel ? handleCancel : undefined}
            disabled={!canCancel && !canSubmit}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg text-white transition ${
              canCancel
                ? "cursor-pointer bg-rose-500 hover:bg-rose-600"
                : canSubmit
                  ? "cursor-pointer bg-[#1d1d1f] hover:bg-black"
                  : "cursor-not-allowed bg-black/25"
            }`}
          >
            {isLoading ? "…" : canCancel ? "■" : "↑"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PromptBox;

function syncTextareaHeight(
  textarea: HTMLTextAreaElement | null,
  minRows: number,
) {
  if (!textarea || typeof window === "undefined") {
    return;
  }

  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 28;
  const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
  const verticalPadding = paddingTop + paddingBottom;
  const maxRows = 6;
  const minHeight = lineHeight * minRows + verticalPadding;
  const maxHeight = lineHeight * maxRows + verticalPadding;

  textarea.style.height = "0px";

  const nextHeight = Math.min(
    Math.max(textarea.scrollHeight, minHeight),
    maxHeight,
  );

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}
