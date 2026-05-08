"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectDetailResponse } from "@zeno/shared";
import PromptBox from "@/components/home/prompt-box";
import SideNav from "@/components/home/side-nav";
import ProjectMessageList from "@/components/project/chat/project-message-list";
import ProjectTabs from "@/components/project/project-tabs";
import { useProjectChatController } from "@/hooks/project/use-project-chat-controller";

type ProjectChatLayoutProps = {
  initialProjectDetail: ProjectDetailResponse;
};

const CHAT_DISCLAIMER =
  "Zeno는 실수를 할 수 있습니다. 중요한 정보는 재차 확인하세요.";
const MESSAGE_LIST_BOTTOM_PADDING = 200;

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

  useEffect(() => {
    const currentId = latestGeneration?.generationId ?? null;
    if (currentId !== null && currentId !== prevGenerationIdRef.current) {
      prevGenerationIdRef.current = currentId;
      setLocalSelectedVariantId(null);
    }
  }, [latestGeneration?.generationId]);

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
    <section className="flex h-screen overflow-hidden bg-[#050808]">
      {/* 사이드바 */}
      <div className="hidden md:block">
        <SideNav showGuestCard={false} variant="dark" />
      </div>

      <main className="relative flex h-screen min-w-0 flex-1 overflow-hidden">
        {/* 왼쪽: 채팅 패널 */}
        <div className="relative flex h-full w-[480px] flex-shrink-0 flex-col">
          {/* 배경 그라디언트 효과 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-8%] top-[-6%] h-[26rem] w-[26rem] rounded-full bg-emerald-400/12 blur-[140px]" />
            <div className="absolute left-[8%] top-[18%] h-[22rem] w-[22rem] rounded-full bg-emerald-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[10%] h-[18rem] w-[18rem] rounded-full bg-green-500/12 blur-[120px]" />
            <div className="absolute left-1/2 top-0 h-full w-[24rem] -translate-x-1/2 bg-emerald-400/8 blur-[120px]" />
            <div className="absolute right-[-10%] top-[-2%] h-[38rem] w-[38rem] rounded-full bg-teal-200/22 blur-[180px]" />
            <div className="absolute right-[8%] top-[42%] h-[26rem] w-[26rem] rounded-full bg-emerald-400/14 blur-[150px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.15)_30%,rgba(0,0,0,0.72)_70%,rgba(0,0,0,0.9)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0.84)_18%,rgba(0,0,0,0.92)_48%,rgba(0,0,0,0.18)_100%)]" />
          </div>

          <div className="relative z-10 h-full">
            {/* 메시지 목록 */}
            <div className="h-full overflow-x-hidden overflow-y-auto">
              <header className="flex items-center justify-between px-5 pt-5 md:hidden">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tracking-[0.28em] text-white/86">
                    ZENO
                  </span>
                </div>
              </header>

              <div className="mx-auto flex min-h-full w-full flex-col px-5 pt-6">
                <p className="text-center text-[13px] font-normal leading-[1.7] text-white/50">
                  {headerTimestamp}
                </p>

                <div className="mt-6 flex-1">
                  <ProjectMessageList
                    messages={messages}
                    deferredAssistantStatuses={deferredAssistantStatuses}
                    onTypingComplete={commitDeferredAssistantStatus}
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

            {/* 입력창 - 하단 고정 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-4">
              <div className={needsVariantSelection ? "pointer-events-none opacity-40" : "pointer-events-auto"}>
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

        {/* 구분선 */}
        <div className="w-px shrink-0 self-stretch bg-white/15" />

        {/* 오른쪽: Preview/Code 패널 */}
        <div className="h-full min-w-0 flex-1 overflow-hidden">
          {selectedVariant ? (
            <ProjectTabs project={selectedVariant.project} />
          ) : null}
        </div>
      </main>
    </section>
  );
};

export default ProjectChatLayout;
