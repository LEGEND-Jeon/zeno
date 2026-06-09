"use client";

import { useEffect, useRef, useState } from "react";
import { useStreamingText } from "@/hooks/project/use-streaming-text";
import dynamic from "next/dynamic";
import SideNav from "@/components/home/side-nav";
import PromptBox from "@/components/home/prompt-box";
import GenerationLoading from "@/components/project/generation-loading";
import { AssistantBubble } from "@/components/project/chat/assistant-message";
import AssistantMarkdownContent from "@/components/project/chat/assistant-markdown-content";
import PlanKeywordsCard from "@/components/project/chat/plan-keywords-card";
import AssistantChoiceInteraction from "@/components/project/chat/assistant-choice-interaction";
import { STATIC_VARIANTS, type StaticVariant } from "@/lib/static-variants";
import type {
  AssistantChoiceInteraction as ChoiceInteractionData,
  ChoiceResponse,
  PlanKeywordGroup,
} from "@/shared";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ── 상수 ── */
const PLANNING_DELAY_MS = 3_000;
const GENERATION_DELAY_MS = 9_000;
const CHAT_DISCLAIMER = "Zeno는 실수를 할 수 있습니다. 중요한 정보는 재차 확인하세요.";
const MIN_CHAT_WIDTH = 240;
const MIN_RIGHT_PANEL_WIDTH = 240;
const DEFAULT_CHAT_WIDTH = 460;

/* ── 정적 콘텐츠 ── */
const PLANNING_CONTENT = `귀엽고 실용적인 일정 관리 앱, 같이 만들어봐요 🗓️

요청하신 내용을 바탕으로 투두메이트 감성의 미니멀하고 따뜻한 일정 관리 앱을 만들어드릴게요. 구현 방향을 먼저 정리해드릴게요.

**전체 구조 방향**

앱의 핵심은 세 가지 뷰(월간 / 주간 / 일간) 간의 자연스러운 전환이에요. 상단에 뷰 전환 탭을 두고, 선택된 뷰에 따라 캘린더 영역이 부드럽게 전환되는 방식으로 구성해요. 하단에는 심플한 탭바를 배치해 홈(캘린더), 일정 목록, 설정으로 이동할 수 있게 해요.

**일정 관리 (모달 기반)**

날짜나 기존 일정을 클릭하면 모달이 올라오면서 일정 추가·수정·삭제를 모두 처리해요. 모달 안에서 제목, 시간, 카테고리(업무 / 개인 / 건강) 선택이 가능하고, 삭제는 수정 모달 하단에 버튼으로 제공해요. placeholder 없이 실제 상태 관리(localStorage 또는 상태 라이브러리)로 데이터가 저장되고 유지돼요.

**카테고리 색상 구분**

업무 → 소프트 블루 계열 🔵
개인 → 라벤더/퍼플 계열 🟣
건강 → 민트/그린 계열 🟢
캘린더 날짜 셀 안에 작은 색상 도트, 주간/일간 뷰에서는 카드 왼쪽에 컬러 바로 카테고리를 직관적으로 표현해요.

**디자인 톤 & 무드**

투두메이트처럼 흰색/크림 배경에 파스텔 포인트 컬러를 사용하고, 둥근 모서리(border-radius)와 부드러운 그림자로 카드감을 살려요. 폰트는 가독성 좋고 친근한 산세리프 계열로, 딱딱한 기업 느낌이 아닌 따뜻하고 생동감 있는 분위기를 만들어요. 다크 배경이나 복잡한 레이아웃은 철저히 배제해요.

**배포 완성도**

더미 데이터 없이 실제 동작하는 CRUD 로직을 구현하고, 새로고침해도 데이터가 유지되도록 localStorage에 일정을 저장해요. 반응형으로 모바일/데스크탑 모두 자연스럽게 동작하도록 만들어드릴게요.

이 방향으로 바로 생성 들어갈게요! 원하시면 특정 뷰(월간 우선 등)나 추가 기능(반복 일정, 알림 등)도 말씀해주세요 😊`;

const PLAN_KEYWORDS: PlanKeywordGroup[] = [
  { label: "핵심가치", color: "yellow", items: ["따뜻함", "활기", "정돈", "스타일"] },
  { label: "형태",    color: "blue",   items: ["미니멀", "귀여움", "파스텔"] },
  { label: "컬러",   color: "green",  items: ["카드형", "모달", "탭바"] },
  { label: "배제",   color: "pink",   items: ["다크", "복잡함", "딱딱함"] },
];

const CHOICE_INTERACTION: ChoiceInteractionData = {
  type: "choice",
  id: "color-choice",
  title: "메인 컬러 방향을 골라주세요 🎨",
  description: "전체 앱의 무드를 결정하는 가장 중요한 선택이에요!",
  options: [
    { id: "1", label: "💜 보라 & 민트",        description: "투두메이트와 비슷한 감성, 차분하고 세련된 느낌",   prompt: "보라 & 민트 컬러로 만들어줘" },
    { id: "2", label: "🍑 피치 & 코랄",         description: "따뜻하고 귀여운 감성, 에너지 넘치는 느낌",        prompt: "피치 & 코랄 컬러로 만들어줘" },
    { id: "3", label: "💙 스카이 블루 & 라벤더", description: "깨끗하고 상쾌한 느낌, 집중하기 좋은 톤",          prompt: "스카이 블루 & 라벤더로 만들어줘" },
    { id: "4", label: "✨ 제노한테 맡길게요",    description: "디자인 감각을 믿고 최선의 선택을 부탁드려요",    prompt: "제노가 최선의 선택을 해줘" },
  ],
};

const SELECTED_CHOICE: ChoiceResponse = {
  sourceMessageId: "plan-msg",
  interactionId: "color-choice",
  optionId: "4",
  label: "✨ 제노한테 맡길게요",
  prompt: "제노가 최선의 선택을 해줘",
};

const GENERATE_CONTENT = `✨ 제노한테 맡길게요

미니멀하고 귀여운 일정 앱에 어울리는 컬러를 Zeno가 직접 큐레이션해서 4가지 시안으로 만들었어요. 투두메이트 감성을 베이스로, 각 시안마다 전혀 다른 컬러 무드를 담았어요. 월간/주간/일간 뷰 전환, 카테고리별 색상 구분, 일정 CRUD 기능이 모두 실제로 동작해요.

**A — 살구빛 코랄 (#FF8B6B):** 크림 화이트 배경에 따뜻하고 포근한 일상 다이어리 무드. 투두메이트 감성에 가장 가까운 시안이에요.

**B — 스카이 라벤더 (#A78BFA):** 연보라 배경에 차분하고 감성적인 집중·정돈 무드. 구조적인 레이아웃으로 깔끔하게.

**C — 민트 그린 (#3ECFA0):** 흰 배경에 청량하고 생동감 있는 생산성 무드. 주간 뷰에서 가로 스크롤 카드로 차별화.

**D — 선샤인 옐로우 (#FFD166):** 크림 배경에 밝고 에너지 넘치는 활기찬 무드. 넉넉한 여백과 둥글둥글한 UI가 귀여워요.

각 시안의 컬러 무드를 비교해보고 가장 끌리는 걸 선택해주세요. 선택하신 시안을 기반으로 세부 기능이나 디자인을 더 다듬을 수 있고, 컬러를 살짝 조정하거나 다른 느낌을 원하면 언제든 말씀해주세요!`;

/* ── 아이콘 ── */
const PanelCollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="6" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const PanelExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="6" x2="3" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const EyeIcon = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
    <path d="M 18 6 C 18 7.2 13.97 12 9 12 C 4.03 12 0 7.2 0 6 C 0 4.8 4.03 0 9 0 C 13.97 0 18 4.8 18 6 Z" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const CodeIcon = () => (
  <svg width="21" height="18" viewBox="0 0 21.486 17.789" fill="currentColor" aria-hidden="true">
    <path d="M 13.22878646850586 0.03742626681923866 C 13.484025567770004 0.10921671614050865 13.70030565559864 0.27943406999111176 13.830072402954102 0.5106514096260071 C 13.959839150309563 0.7418687492609024 13.99246921390295 1.015156775712967 13.92078685760498 1.2704262733459473 L 9.4907865524292 17.058425903320312 C 9.455329645425081 17.184888869524002 9.395310677587986 17.303130999207497 9.314157485961914 17.40639877319336 C 9.233004294335842 17.509666547179222 9.132306411862373 17.59593876451254 9.01781177520752 17.660289764404297 C 8.903317138552666 17.724640764296055 8.777268290519714 17.7658090852201 8.646862983703613 17.78144645690918 C 8.516457676887512 17.79708382859826 8.384249716997147 17.78688360378146 8.257786750793457 17.751426696777344 C 8.131323784589767 17.715969789773226 8.01308260858059 17.655951775610447 7.909814834594727 17.574798583984375 C 7.806547060608864 17.493645392358303 7.720274843275547 17.392946556210518 7.655923843383789 17.278451919555664 C 7.591572843492031 17.16395728290081 7.550403568893671 17.03790843486786 7.53476619720459 16.907503128051758 C 7.519128825515509 16.777097821235657 7.529329050332308 16.64488986134529 7.564785957336426 16.5184268951416 L 11.994786262512207 0.7304263710975647 C 12.03022126108408 0.6038443148136139 12.090264737606049 0.4854903817176819 12.17148208618164 0.38213470578193665 C 12.252699434757233 0.2787790298461914 12.35349739342928 0.19244953989982605 12.468109130859375 0.1280849277973175 C 12.58272086828947 0.06372031569480896 12.708897665143013 0.022583532612770796 12.839422225952148 0.007027422543615103 C 12.969946786761284 -0.00852868752554059 13.102257803082466 0.0018011219799518585 13.22878646850586 0.03742626681923866 Z M 5.949786186218262 3.9444265365600586 C 6.137257248163223 4.131954222917557 6.242572784423828 4.386262148618698 6.242572784423828 4.651426315307617 C 6.242572784423828 4.916590481996536 6.137257248163223 5.170898407697678 5.949786186218262 5.358426094055176 L 2.4147863388061523 8.894426345825195 L 5.949786186218262 12.429426193237305 C 6.137257248163223 12.616954326629639 6.242572784423828 12.871262252330780 6.242572784423828 13.136426925659180 C 6.242572784423828 13.401591598987580 6.137257248163223 13.655899524688721 5.949786186218262 13.843427657127380 C 5.762315124273300 14.030955343484879 5.508007198572159 14.136270880699158 5.242843031883240 14.136270880699158 C 4.977678865194321 14.136270880699158 4.723370939493180 14.030955343484879 4.535899877548218 13.843427657127380 L 0.2927863597869873 9.601426124572754 C 0.10531529784202576 9.413898438215256 0 9.159590512514114 0 8.894426345825195 C 0 8.629262179136276 0.10531529784202576 8.374954253435135 0.2927863597869873 8.187426567077637 L 4.5357866287231445 3.9444265365600586 C 4.723314315080643 3.756955474615097 4.977622240781784 3.651639938354492 5.242786407470703 3.651639938354492 C 5.507950574159622 3.651639938354492 5.7622584998607635 3.756955474615097 5.949786186218262 3.9444265365600586 Z M 15.535785675048828 5.358426094055176 C 15.348157882690430 5.170898407697678 15.242842912674904 4.916590481996536 15.242842912674904 4.651426315307617 C 15.242842912674904 4.386262148618698 15.348157882690430 4.131954222917557 15.535785675048828 3.9444265365600586 L 19.778785705566406 8.187426567077637 L 21.192787170410156 8.187426567077637 C 21.380258232355118 8.374954253435135 21.485572814941406 8.629262179136276 21.485572814941406 8.894426345825195 C 21.485572814941406 9.159590512514114 21.380258232355118 9.413898438215256 21.192787170410156 9.601426124572754 L 16.949787139892578 13.844427108764648 C 16.762146472930908 14.031935155391693 16.507703751325607 14.137222603734699 16.242433547973633 14.137128829956055 C 15.977163344621658 14.13703505617741 15.722793996334076 14.031566143035889 15.535285949707031 13.843925476074219 C 15.347777903079987 13.656284809112549 15.242490465920127 13.401842087507248 15.242584228515625 13.136571884155273 C 15.242677991111123 12.871301680803299 15.34814502298832 12.61693425476551 15.535785675048828 12.429426193237305 L 19.070785522460938 8.894426345825195 L 15.535785675048828 5.358426094055176 Z" />
  </svg>
);
const MobileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M 8.25 3 L 15.75 3 C 16.993 3 18 4.099 18 5.455 L 18 18.545 C 18 19.901 16.993 21 15.75 21 L 8.25 21 C 7.007 21 6 19.901 6 18.545 L 6 5.455 C 6 4.099 7.007 3 8.25 3 Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="10" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const DesktopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="16" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12L10 17L19 8" stroke="#29dea9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── 로딩 점 ── */
function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2 pl-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-[6px] w-[6px] rounded-full bg-white/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

/* ── 변형 카드 그리드 ── */
function StaticVariantCardGrid({
  variants,
  selectedId,
  onSelect,
  onReselect,
}: {
  variants: StaticVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReselect: () => void;
}) {
  const hasSelection = selectedId !== null;
  return (
    <div className="mt-5 space-y-4">
      <div className="flex gap-[10px]">
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          const isDimmed = hasSelection && !isSelected;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              className={`flex w-[100px] flex-col overflow-hidden rounded-[10px] transition-all ${
                isSelected
                  ? "border-2 border-[#29dea9]"
                  : isDimmed
                    ? "cursor-default border border-white/20 opacity-40"
                    : "border border-white/20 hover:border-[#29dea9]/60 hover:opacity-90"
              }`}
            >
              <div className="flex h-[70px] w-full flex-col gap-[7px] pb-[40px] pl-[10px] pr-[10px] pt-[12px]" style={{ backgroundColor: v.bgColor }}>
                <div className="h-[4px] w-[70px] rounded-[140px]" style={{ backgroundColor: v.primaryColor }} />
                <div className="h-[4px] w-[50px] rounded-[140px]" style={{ backgroundColor: v.primaryColor + "99" }} />
              </div>
              <div className="flex min-h-[40px] w-full items-center justify-center gap-[4px] bg-black px-[8px] py-[6px]">
                <span className="text-center text-[11px] leading-[1.4] text-white">{v.styleKeywords[0] ?? v.name}</span>
                {isSelected && <CheckIcon />}
              </div>
            </button>
          );
        })}
      </div>
      {hasSelection && (
        <button
          type="button"
          onClick={onReselect}
          className="flex h-[50px] w-[261px] items-center justify-center rounded-[10px] border border-white text-[16px] font-semibold text-white transition hover:bg-white/10"
        >
          시안 다시 선택하기
        </button>
      )}
    </div>
  );
}

/* ── 우측 프리뷰/코드 패널 ── */
function DemoRightPanel({
  variant,
  chatHidden,
  onToggleChat,
}: {
  variant: StaticVariant;
  chatHidden: boolean;
  onToggleChat: () => void;
}) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("mobile");
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "code" || htmlContent !== null) return;
    fetch(variant.previewPath)
      .then((r) => r.text())
      .then(setHtmlContent)
      .catch(() => setHtmlContent("<!-- 불러오기 실패 -->"));
  }, [tab, variant.previewPath, htmlContent]);

  useEffect(() => { setHtmlContent(null); }, [variant.id]);

  return (
    <div className="flex h-full flex-col bg-[#0f0f0f]">
      {/* 탑바 */}
      <div className="flex h-[60px] shrink-0 items-center gap-5 pl-2 pr-5">
        <div className="flex shrink-0 items-center gap-[12px]">
          <button
            type="button"
            onClick={onToggleChat}
            aria-label={chatHidden ? "채팅 패널 열기" : "채팅 패널 숨기기"}
            className={`flex h-[24px] w-[24px] items-center justify-center transition ${chatHidden ? "text-white" : "text-white/50 hover:text-white/80"}`}
          >
            {chatHidden ? <PanelExpandIcon /> : <PanelCollapseIcon />}
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "mobile" ? "desktop" : "mobile")}
            aria-label={viewMode === "mobile" ? "데스크탑 뷰" : "모바일 뷰"}
            className={`flex h-[24px] w-[24px] items-center justify-center transition ${viewMode === "mobile" ? "text-white" : "text-white/40 hover:text-white/70"}`}
          >
            {viewMode === "mobile" ? <DesktopIcon /> : <MobileIcon />}
          </button>
        </div>

        <div className="flex flex-1 items-center gap-[6px]">
          <button type="button" onClick={() => setTab("preview")} style={{ borderWidth: "0.5px" }}
            className={`flex h-[30px] w-[40px] items-center justify-center rounded-[4px] border transition ${tab === "preview" ? "border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.2)] text-white" : "border-[rgba(255,255,255,0.2)] text-white/40 hover:border-[rgba(255,255,255,0.4)] hover:text-white/70"}`}>
            <EyeIcon />
          </button>
          <button type="button" onClick={() => setTab("code")} style={{ borderWidth: "0.5px" }}
            className={`flex h-[30px] w-[40px] items-center justify-center rounded-[4px] border transition ${tab === "code" ? "border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.2)] text-white" : "border-[rgba(255,255,255,0.4)] text-white/40 hover:border-[rgba(255,255,255,0.6)] hover:text-white/70"}`}>
            <CodeIcon />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-[10px]">
          <a href={variant.previewPath} download={`${variant.name.toLowerCase()}.html`}
            className="flex h-[30px] items-center justify-center rounded-[4px] bg-[#f0f0f0] px-[10px] text-[10px] font-bold text-black transition hover:bg-[#e0e0e0]">
            ZIP Download
          </a>
          <button type="button" className="flex h-[30px] items-center justify-center rounded-[4px] bg-[#29dea9] px-[10px] text-[10px] font-bold text-black transition hover:bg-[#22c896]">
            Publish
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0f0f0f]">
        {tab === "preview" ? (
          viewMode === "mobile" ? (
            <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-[#0f0f0f]">
              <div style={{ width: "375px", height: "min(812px, calc(100% - 32px))", borderRadius: "20px", overflow: "hidden", border: "1px solid #2a2a2a", backgroundColor: "#000" }}>
                <iframe key={variant.id} src={variant.previewPath} title={variant.title} style={{ width: "100%", height: "100%", border: "none", display: "block", borderRadius: "20px" }} />
              </div>
            </div>
          ) : (
            <div className="mx-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9]/30">
              <iframe key={variant.id} src={variant.previewPath} title={variant.title} style={{ width: "100%", height: "100%", border: "none", display: "block" }} />
            </div>
          )
        ) : (
          <div className="mx-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9]/30">
            {htmlContent === null ? (
              <div className="flex h-full items-center justify-center text-sm text-white/40">코드 로딩 중...</div>
            ) : (
              <MonacoEditor height="100%" language="html" value={htmlContent} theme="vs-dark"
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 메인 레이아웃 ── */
type Phase = "planning-loading" | "choice" | "generating" | "complete";

export default function DemoProjectLayout() {
  const [phase, setPhase] = useState<Phase>("planning-loading");
  const [prompt, setPrompt] = useState("귀엽고 실용적인 일정 관리 앱 만들어줘");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatHidden, setChatHidden] = useState(false);
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [headerTimestamp] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  });

  const mainRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_CHAT_WIDTH);

  useEffect(() => {
    const stored = sessionStorage.getItem("demo_prompt");
    if (stored) { setPrompt(stored); sessionStorage.removeItem("demo_prompt"); }
    const t = setTimeout(() => setPhase("choice"), PLANNING_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

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

  function handleDividerMouseDown(e: React.MouseEvent) {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = chatWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }

  function handleChoiceSelect() {
    setPhase("generating");
    setTimeout(() => setPhase("complete"), GENERATION_DELAY_MS);
  }

  const isPlanningVisible = phase === "choice" || phase === "generating" || phase === "complete";
  const { visibleContent: planningVisible, isDrained: planningDrained } = useStreamingText(
    isPlanningVisible ? PLANNING_CONTENT : ""
  );

  const { visibleContent: generateVisible, isDrained: generateDrained } = useStreamingText(
    phase === "complete" ? GENERATE_CONTENT : ""
  );

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [phase, selectedId, planningVisible, generateVisible]);

  const selectedVariant = selectedId ? STATIC_VARIANTS.find((v) => v.id === selectedId) ?? null : null;
  const showRightPanel = phase === "complete" && selectedVariant !== null;
  const needsVariantSelection = phase === "complete" && selectedId === null;

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
        <div
          className="relative flex h-full flex-shrink-0 flex-col overflow-hidden"
          style={{ width: !showRightPanel ? 760 : chatHidden ? 0 : chatWidth, display: showRightPanel && chatHidden ? "none" : undefined }}
        >
          <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
            <div ref={scrollContainerRef} className="flex-1 overflow-x-hidden overflow-y-auto">
              <div className="mx-auto flex w-full flex-col px-5 pt-6">
                <p className="text-center text-[13px] font-normal leading-[1.7] text-white/50">{headerTimestamp}</p>

                <div className="mx-auto mt-6 flex max-w-[780px] w-full flex-col gap-8">
                  {/* 유저 메시지 */}
                  <div className="ml-auto max-w-[400px] rounded-[10px] bg-white/20 px-4 py-3 text-[16px] leading-[1.7] text-white shadow-[0_0_10px_rgba(255,255,255,0.08)]">
                    <p className="whitespace-pre-wrap">{prompt}</p>
                  </div>

                  {/* 기획 단계: 로딩 */}
                  {phase === "planning-loading" && <LoadingDots />}

                  {/* 기획 단계: 응답 */}
                  {isPlanningVisible && (
                    <AssistantBubble>
                      <AssistantMarkdownContent content={planningVisible} />
                      {planningDrained && <PlanKeywordsCard groups={PLAN_KEYWORDS} />}
                      {planningDrained && (
                        <AssistantChoiceInteraction
                          interaction={CHOICE_INTERACTION}
                          selectedChoiceResponse={phase !== "choice" ? SELECTED_CHOICE : null}
                          disabled={phase !== "choice"}
                          onSelect={handleChoiceSelect}
                        />
                      )}
                    </AssistantBubble>
                  )}

                  {/* 선택한 컬러 방향 (유저 메시지) */}
                  {(phase === "generating" || phase === "complete") && (
                    <div className="ml-auto max-w-[400px] rounded-[10px] bg-white/20 px-4 py-3 text-[16px] leading-[1.7] text-white shadow-[0_0_10px_rgba(255,255,255,0.08)]">
                      <p className="whitespace-pre-wrap">{SELECTED_CHOICE.label}</p>
                    </div>
                  )}

                  {/* 생성 단계: 로딩 */}
                  {phase === "generating" && <LoadingDots />}

                  {/* 생성 완료: 응답 + 시안 카드 */}
                  {phase === "complete" && (
                    <AssistantBubble>
                      <AssistantMarkdownContent content={generateVisible} />
                      {generateDrained && (
                        <StaticVariantCardGrid
                          variants={STATIC_VARIANTS}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                          onReselect={() => setSelectedId(null)}
                        />
                      )}
                    </AssistantBubble>
                  )}
                </div>
              </div>
            </div>

            {/* 입력창 */}
            <div className="flex-shrink-0 px-5 pb-4 pt-2">
              <div className="pointer-events-none opacity-40">
                <PromptBox variant="chat" isBusy={true} />
              </div>
              {needsVariantSelection ? (
                <p className="mt-1 text-center text-[11px] leading-4 text-[#80f3c9]/70">시안을 먼저 선택해주세요</p>
              ) : (
                <p className="mt-1 text-center text-[11px] leading-4 text-white/30">{CHAT_DISCLAIMER}</p>
              )}
            </div>
          </div>
        </div>

        {/* 리사이즈 핸들 */}
        {showRightPanel && !chatHidden && (
          <div
            className="group relative flex w-3 shrink-0 cursor-col-resize select-none items-center justify-center self-stretch"
            onMouseDown={handleDividerMouseDown}
          >
            <div className="h-full w-px bg-white/15 transition-colors group-hover:bg-white/25" />
            <div className="absolute left-1/2 top-1/2 flex h-[26px] w-[13px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[3.5px] rounded-full bg-white/90 shadow-sm">
              <div className="h-[3px] w-[3px] rounded-full bg-black/30" />
              <div className="h-[3px] w-[3px] rounded-full bg-black/30" />
              <div className="h-[3px] w-[3px] rounded-full bg-black/30" />
            </div>
          </div>
        )}

        {/* 오른쪽: 프리뷰/코드 패널 */}
        {showRightPanel && (
          <div className="h-full min-w-0 flex-1 overflow-hidden">
            {selectedVariant && (
              <DemoRightPanel variant={selectedVariant} chatHidden={chatHidden} onToggleChat={() => setChatHidden((v) => !v)} />
            )}
          </div>
        )}
      </main>
    </section>
  );
}
