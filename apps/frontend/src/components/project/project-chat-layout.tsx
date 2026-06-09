"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TYPING_COMPLETE_TIMEOUT_MS = 10_000;
import type { ProjectDetailResponse } from "@/shared";
import PromptBox from "@/components/home/prompt-box";
import SideNav from "@/components/home/side-nav";
import ProjectMessageList from "@/components/project/chat/project-message-list";
import ProjectTabs from "@/components/project/project-tabs";
import GenerationLoading from "@/components/project/generation-loading";
import { useProjectChatController } from "@/hooks/project/use-project-chat-controller";

type ProjectChatLayoutProps = {
  initialProjectDetail: ProjectDetailResponse;
};

const CHAT_DISCLAIMER =
  "Zeno는 실수를 할 수 있습니다. 중요한 정보는 재차 확인하세요.";
const MESSAGE_LIST_BOTTOM_PADDING = 24;
const MIN_CHAT_WIDTH = 240;
const MIN_RIGHT_PANEL_WIDTH = 240;
const DEFAULT_CHAT_WIDTH = 460;

const ProjectChatLayout = ({
  initialProjectDetail,
}: ProjectChatLayoutProps) => {
  const {
    messages,
    projectDetail,
    headerTimestamp,
    deferredAssistantStatuses,
    commitDeferredAssistantStatus,
    handleSubmitPrompt,
    handleSubmitChoice,
    handleCancelPrompt,
    isPromptBusy,
    isCancelling,
  } = useProjectChatController(initialProjectDetail);

  const { latestGeneration } = projectDetail;

  const [localSelectedVariantId, setLocalSelectedVariantId] = useState<string | null>(
    initialProjectDetail.project.selectedVariantId ?? null,
  );

  const prevGenerationIdRef = useRef<string | null>(
    initialProjectDetail.latestGeneration?.generationId ?? null,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const [chatHidden, setChatHidden] = useState(false);
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);

  const deferredTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ids = Object.keys(deferredAssistantStatuses);
    if (ids.length === 0) {
      if (deferredTimeoutRef.current !== null) {
        clearTimeout(deferredTimeoutRef.current);
        deferredTimeoutRef.current = null;
      }
      return;
    }
    if (deferredTimeoutRef.current !== null) return;
    const [firstId] = ids;
    deferredTimeoutRef.current = setTimeout(() => {
      deferredTimeoutRef.current = null;
      commitDeferredAssistantStatus(firstId);
    }, TYPING_COMPLETE_TIMEOUT_MS);
  }, [deferredAssistantStatuses, commitDeferredAssistantStatus]);

  const handleTypingComplete = useCallback(
    (assistantMessageId: string) => {
      if (deferredTimeoutRef.current !== null) {
        clearTimeout(deferredTimeoutRef.current);
        deferredTimeoutRef.current = null;
      }
      commitDeferredAssistantStatus(assistantMessageId);
    },
    [commitDeferredAssistantStatus],
  );

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_CHAT_WIDTH);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const maxChatWidth = (mainRef.current?.offsetWidth ?? window.innerWidth) - MIN_RIGHT_PANEL_WIDTH;
      setChatWidth(Math.min(maxChatWidth, Math.max(MIN_CHAT_WIDTH, startWidthRef.current + delta)));
    };
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = chatWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  useEffect(() => {
    const currentId = latestGeneration?.generationId ?? null;
    if (currentId !== null && currentId !== prevGenerationIdRef.current) {
      prevGenerationIdRef.current = currentId;
      setLocalSelectedVariantId(null);
    }
  }, [latestGeneration?.generationId]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // 마지막으로 완료된 assistant 메시지의 mode
  const lastAssistantMode = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.status !== "pending" && m.mode != null)
        ?.mode ?? null,
    [messages],
  );

  // generate/refine 응답이 온 적 있거나, latestGeneration이 있을 때만 오른쪽 패널 표시
  const showRightPanel =
    latestGeneration !== null ||
    lastAssistantMode === "generate" ||
    lastAssistantMode === "refine";

  const needsVariantSelection =
    latestGeneration !== null && localSelectedVariantId === null;

  const selectedVariant = localSelectedVariantId
    ? latestGeneration?.variants.find((v) => v.id === localSelectedVariantId) ?? null
    : null;

  const handleSubmitWithVariant = useCallback(
    async (prompt: string) => {
      await handleSubmitPrompt(prompt, localSelectedVariantId ?? undefined);
    },
    [handleSubmitPrompt, localSelectedVariantId],
  );

  if (!messages.length) {
    return null;
  }

  return (
    <section
      className="flex h-screen overflow-hidden"
      style={{
        background: [
          "radial-gradient(ellipse 75% 60% at 100% 0%, rgba(0,235,178,0.85) 0%, rgba(0,200,155,0.4) 38%, transparent 65%)",
          "radial-gradient(ellipse 65% 58% at 0% 100%, rgba(0,210,158,0.72) 0%, rgba(0,175,132,0.36) 38%, transparent 65%)",
          "#050d0e",
        ].join(", "),
      }}
    >
      {/* 사이드바 */}
      <div className="hidden md:block bg-[#080808]">
        <SideNav showGuestCard={false} variant="dark" />
      </div>

      <main ref={mainRef} className={`relative flex h-screen min-w-0 flex-1 overflow-hidden${!showRightPanel ? " justify-center" : ""}`}>
        {/* 왼쪽: 채팅 패널 */}
        <div className="relative flex h-full flex-shrink-0 flex-col overflow-hidden" style={{ width: !showRightPanel ? 760 : chatHidden ? 0 : chatWidth, display: showRightPanel && chatHidden ? 'none' : undefined }}>

          <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
            {/* 메시지 목록 — 이 영역만 스크롤 */}
            <div ref={scrollContainerRef} className="flex-1 overflow-x-hidden overflow-y-auto">
              <header className="flex items-center justify-between px-5 pt-5 md:hidden">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tracking-[0.28em] text-white/86">
                    ZENO
                  </span>
                </div>
              </header>

              <div className="mx-auto flex w-full flex-col px-5 pt-6">
                <p className="text-center text-[13px] font-normal leading-[1.7] text-white/50">
                  {headerTimestamp}
                </p>

                <div className="mt-6">
                  <ProjectMessageList
                    messages={messages}
                    deferredAssistantStatuses={deferredAssistantStatuses}
                    onTypingComplete={handleTypingComplete}
                    onSubmitChoice={handleSubmitChoice}
                    isChoiceDisabled={isPromptBusy}
                    bottomPadding={MESSAGE_LIST_BOTTOM_PADDING}
                    variants={latestGeneration?.variants ?? null}
                    latestGenerationId={latestGeneration?.generationId ?? null}
                    localSelectedVariantId={localSelectedVariantId}
                    onSelectVariant={setLocalSelectedVariantId}
                    onReselectVariant={() => setLocalSelectedVariantId(null)}
                  />
                </div>
              </div>
            </div>

            {/* 입력창 — flex-shrink-0으로 항상 하단 고정 */}
            <div className="flex-shrink-0 px-5 pb-4 pt-2">
              <div className={needsVariantSelection ? "pointer-events-none opacity-40" : ""}>
                <PromptBox
                  variant="chat"
                  onSubmitPrompt={handleSubmitWithVariant}
                  onCancel={handleCancelPrompt}
                  isBusy={isPromptBusy || needsVariantSelection}
                  isCancelling={isCancelling}
                />
              </div>
              {needsVariantSelection ? (
                <p className="mt-1 text-center text-[11px] leading-4 text-[#80f3c9]/70">
                  시안을 먼저 선택해주세요
                </p>
              ) : (
                <p className="mt-1 text-center text-[11px] leading-4 text-white/30">
                  {CHAT_DISCLAIMER}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 리사이즈 핸들 */}
        {showRightPanel && !chatHidden && <div
          className="group relative flex w-3 shrink-0 cursor-col-resize select-none items-center justify-center self-stretch"
          onMouseDown={handleDividerMouseDown}
        >
          <div className="h-full w-px bg-white/15 transition-colors group-hover:bg-white/25" />
          <div className="absolute left-1/2 top-1/2 flex h-[26px] w-[13px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[3.5px] rounded-full bg-white/90 shadow-sm">
            <div className="h-[3px] w-[3px] rounded-full bg-black/30" />
            <div className="h-[3px] w-[3px] rounded-full bg-black/30" />
            <div className="h-[3px] w-[3px] rounded-full bg-black/30" />
          </div>
        </div>}

        {/* 오른쪽: Preview/Code 패널 */}
        {showRightPanel && (
          <div className="h-full min-w-0 flex-1 overflow-hidden">
            {selectedVariant ? (
              <ProjectTabs
                project={selectedVariant.project}
                chatHidden={chatHidden}
                onToggleChat={() => setChatHidden((v) => !v)}
              />
            ) : isPromptBusy ? (
              <GenerationLoading />
            ) : null}
          </div>
        )}
      </main>
    </section>
  );
};

export default ProjectChatLayout;
