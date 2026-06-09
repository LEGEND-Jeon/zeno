"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import JSZip from "jszip";
import type { GeneratedProject, VariantBrief } from "@zeno/shared";
import type { SectionClickData } from "@/components/preview/webcontainer-preview";

const WebContainerPreview = dynamic(
  () => import("@/components/preview/webcontainer-preview"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-white/40">
        Preview 로딩 중...
      </div>
    ),
  },
);

const CodeWorkspace = dynamic(
  () => import("@/components/code/code-workspace"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-white/40">
        코드 뷰어 로딩 중...
      </div>
    ),
  },
);

type Props = {
  project: GeneratedProject;
  brief?: VariantBrief;
  chatHidden?: boolean;
  onToggleChat?: () => void;
  onSectionClick?: (data: SectionClickData) => void;
};

/* ── 아이콘 ─────────────────────────────────────────────────── */

/* ── Publish 패널 아이콘 ─────────────────────────────────────── */

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" stroke="#29dea9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="8.5" y1="13.5" x2="15.5" y2="17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="15.5" y1="6.5" x2="8.5" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 3c-2.5 3-3.5 5.5-3.5 9s1 6 3.5 9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 3c2.5 3 3.5 5.5 3.5 9s-1 6-3.5 9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/* panel collapse/expand icons for button #1 */
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

/* Figma ic_preview — exact paths from node 1497:7902, viewBox matches eye local coords */
const EyeIcon = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
    <path
      d="M 18 6 C 18 7.2 13.97 12 9 12 C 4.03 12 0 7.2 0 6 C 0 4.8 4.03 0 9 0 C 13.97 0 18 4.8 18 6 Z"
      stroke="currentColor" strokeWidth="2"
    />
    <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/* Figma ic_code — exact path from node 1497:7896, filled (no stroke), viewBox = path local bounds */
const CodeIcon = () => (
  <svg width="21" height="18" viewBox="0 0 21.486 17.789" fill="currentColor" aria-hidden="true">
    <path d="M 13.22878646850586 0.03742626681923866 C 13.484025567770004 0.10921671614050865 13.70030565559864 0.27943406999111176 13.830072402954102 0.5106514096260071 C 13.959839150309563 0.7418687492609024 13.99246921390295 1.015156775712967 13.92078685760498 1.2704262733459473 L 9.4907865524292 17.058425903320312 C 9.455329645425081 17.184888869524002 9.395310677587986 17.303130999207497 9.314157485961914 17.40639877319336 C 9.233004294335842 17.509666547179222 9.132306411862373 17.59593876451254 9.01781177520752 17.660289764404297 C 8.903317138552666 17.724640764296055 8.777268290519714 17.7658090852201 8.646862983703613 17.78144645690918 C 8.516457676887512 17.79708382859826 8.384249716997147 17.78688360378146 8.257786750793457 17.751426696777344 C 8.131323784589767 17.715969789773226 8.01308260858059 17.655951775610447 7.909814834594727 17.574798583984375 C 7.806547060608864 17.493645392358303 7.720274843275547 17.392946556210518 7.655923843383789 17.278451919555664 C 7.591572843492031 17.16395728290081 7.550403568893671 17.03790843486786 7.53476619720459 16.907503128051758 C 7.519128825515509 16.777097821235657 7.529329050332308 16.64488986134529 7.564785957336426 16.5184268951416 L 11.994786262512207 0.7304263710975647 C 12.03022126108408 0.6038443148136139 12.090264737606049 0.4854903817176819 12.17148208618164 0.38213470578193665 C 12.252699434757233 0.2787790298461914 12.35349739342928 0.19244953989982605 12.468109130859375 0.1280849277973175 C 12.58272086828947 0.06372031569480896 12.708897665143013 0.022583532612770796 12.839422225952148 0.007027422543615103 C 12.969946786761284 -0.00852868752554059 13.102257803082466 0.0018011219799518585 13.22878646850586 0.03742626681923866 Z M 5.949786186218262 3.9444265365600586 C 6.137257248163223 4.131954222917557 6.242572784423828 4.386262148618698 6.242572784423828 4.651426315307617 C 6.242572784423828 4.916590481996536 6.137257248163223 5.170898407697678 5.949786186218262 5.358426094055176 L 2.4147863388061523 8.894426345825195 L 5.949786186218262 12.429426193237305 C 6.137257248163223 12.616954326629639 6.242572784423828 12.871262252330780 6.242572784423828 13.136426925659180 C 6.242572784423828 13.401591598987580 6.137257248163223 13.655899524688721 5.949786186218262 13.843427657127380 C 5.762315124273300 14.030955343484879 5.508007198572159 14.136270880699158 5.242843031883240 14.136270880699158 C 4.977678865194321 14.136270880699158 4.723370939493180 14.030955343484879 4.535899877548218 13.843427657127380 L 0.2927863597869873 9.601426124572754 C 0.10531529784202576 9.413898438215256 0 9.159590512514114 0 8.894426345825195 C 0 8.629262179136276 0.10531529784202576 8.374954253435135 0.2927863597869873 8.187426567077637 L 4.5357866287231445 3.9444265365600586 C 4.723314315080643 3.756955474615097 4.977622240781784 3.651639938354492 5.242786407470703 3.651639938354492 C 5.507950574159622 3.651639938354492 5.7622584998607635 3.756955474615097 5.949786186218262 3.9444265365600586 Z M 15.535785675048828 5.358426094055176 C 15.348157882690430 5.170898407697678 15.242842912674904 4.916590481996536 15.242842912674904 4.651426315307617 C 15.242842912674904 4.386262148618698 15.348157882690430 4.131954222917557 15.535785675048828 3.9444265365600586 L 19.778785705566406 8.187426567077637 L 21.192787170410156 8.187426567077637 C 21.380258232355118 8.374954253435135 21.485572814941406 8.629262179136276 21.485572814941406 8.894426345825195 C 21.485572814941406 9.159590512514114 21.380258232355118 9.413898438215256 21.192787170410156 9.601426124572754 L 16.949787139892578 13.844427108764648 C 16.762146472930908 14.031935155391693 16.507703751325607 14.137222603734699 16.242433547973633 14.137128829956055 C 15.977163344621658 14.13703505617741 15.722793996334076 14.031566143035889 15.535285949707031 13.843925476074219 C 15.347777903079987 13.656284809112549 15.242490465920127 13.401842087507248 15.242584228515625 13.136571884155273 C 15.242677991111123 12.871301680803299 15.34814502298832 12.61693425476551 15.535785675048828 12.429426193237305 L 19.070785522460938 8.894426345825195 L 15.535785675048828 5.358426094055176 Z" />
  </svg>
);

/* Figma ic_mobile — exact paths from node 1497:7903 */
const MobileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M 8.25 3 L 15.75 3 C 16.993 3 18 4.099 18 5.455 L 18 18.545 C 18 19.901 16.993 21 15.75 21 L 8.25 21 C 7.007 21 6 19.901 6 18.545 L 6 5.455 C 6 4.099 7.007 3 8.25 3 Z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
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

const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Figma ic_expand — exact paths extracted from node 1497:7906 */
const FullscreenExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="-rotate-90">
    <line x1="4"  y1="6" x2="5"  y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="9"  y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="19" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M 12 19 L 12 11 L 9 14 M 15 14 L 12 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* exit fullscreen — same icon flipped vertically */
const FullscreenExitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="-rotate-90">
    <line x1="4"  y1="18" x2="5"  y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="9"  y1="18" x2="10" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="19" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M 12 5 L 12 13 L 9 10 M 15 10 L 12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── 컴포넌트 ────────────────────────────────────────────────── */

export default function ProjectTabs({ project, brief, chatHidden, onToggleChat, onSectionClick }: Props) {
  const previewKey = useMemo(() => {
    const entry =
      project.files.find((f) => f.path === "/index.html") ??
      project.files.find((f) => f.path === project.entry) ??
      project.files[0];
    return entry?.content ?? project.entry;
  }, [project]);

  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">(
    () => brief?.productType === "app" ? "mobile" : "desktop"
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (brief?.productType === "app") {
      setViewMode("mobile");
    } else {
      setViewMode("desktop");
    }
  }, [brief?.productType]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const [isZipping, setIsZipping] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [visibility, setVisibility] = useState<"private" | "link" | "public">("private");
  const [isPublished, setIsPublished] = useState(false);
  const [lastPublishedKey, setLastPublishedKey] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const publishRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPublishOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (publishRef.current && !publishRef.current.contains(e.target as Node)) {
        setIsPublishOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPublishOpen]);

  function handlePublish() {
    const htmlContent =
      project?.files?.find((f) => f.path.includes("index.html"))?.content ??
      `<html><body>${project?.files?.find((f) => f.path.includes("App.tsx"))?.content ?? ""}</body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    setIsPublished(true);
    setLastPublishedKey(previewKey);

    const preview = new URL(window.location.href);
    preview.searchParams.set("preview", "true");
    setPublishedUrl(preview.toString());
  }

  async function handleCopyUrl() {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // clipboard 권한 없으면 무시
    }
  }

  async function handleZipDownload() {
    if (!project?.files) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const file of project.files) {
        const filePath = file.path.startsWith("/") ? file.path.slice(1) : file.path;
        zip.file(filePath, file.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zeno-project.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  }

  function handleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.fullscreenEnabled) {
      containerRef.current.requestFullscreen();
    }
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-[#0f0f0f]">

      {/* ── 상단 바 (Figma topbar_default 기준) ── */}
      <div className="flex h-[60px] shrink-0 items-center gap-5 pl-2 pr-5">

        {/* 왼쪽: expand(-rotate-90) + mobile 아이콘 — gap-[12px] */}
        <div className="flex shrink-0 items-center gap-[12px]">
          {/* chat panel toggle */}
          <button
            type="button"
            onClick={onToggleChat}
            aria-label={chatHidden ? "채팅 패널 열기" : "채팅 패널 숨기기"}
            className={`flex h-[24px] w-[24px] items-center justify-center transition ${
              chatHidden ? "text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            {chatHidden ? <PanelExpandIcon /> : <PanelCollapseIcon />}
          </button>

          {/* mobile 아이콘: 클릭 시 mobile 뷰 전환 */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "mobile" ? "desktop" : "mobile")}
            aria-label={viewMode === "mobile" ? "데스크탑 뷰" : "모바일 뷰"}
            className={`flex h-[24px] w-[24px] items-center justify-center transition ${
              viewMode === "mobile"
                ? "text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {viewMode === "mobile" ? <DesktopIcon /> : <MobileIcon />}
          </button>
        </div>

        {/* 중앙: preview + code 탭 — Figma border-[0.5px] */}
        <div className="flex flex-1 items-center gap-[6px]">
          <button
            type="button"
            onClick={() => setTab("preview")}
            aria-label="Preview"
            style={{ borderWidth: "0.5px" }}
            className={`flex h-[30px] w-[40px] items-center justify-center rounded-[4px] border transition ${
              tab === "preview"
                ? "border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.2)] text-white"
                : "border-[rgba(255,255,255,0.2)] text-white/40 hover:border-[rgba(255,255,255,0.4)] hover:text-white/70"
            }`}
          >
            <EyeIcon />
          </button>

          <button
            type="button"
            onClick={() => setTab("code")}
            aria-label="Code"
            style={{ borderWidth: "0.5px" }}
            className={`flex h-[30px] w-[40px] items-center justify-center rounded-[4px] border transition ${
              tab === "code"
                ? "border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.2)] text-white"
                : "border-[rgba(255,255,255,0.4)] text-white/40 hover:border-[rgba(255,255,255,0.6)] hover:text-white/70"
            }`}
          >
            <CodeIcon />
          </button>
        </div>

        {/* 오른쪽: 편집모드 + ZIP Download + Publish */}
        <div className="flex shrink-0 items-center gap-[10px]">
          {/* 편집 모드 토글 */}
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            aria-label={editMode ? "편집 모드 끄기" : "편집 모드 켜기"}
            title={editMode ? "편집 모드 끄기" : "섹션 편집 모드"}
            className={`flex h-[30px] items-center justify-center gap-1.5 rounded-[4px] px-[10px] text-[10px] font-bold transition ${
              editMode
                ? "bg-[#29DEA9] text-black"
                : "border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
            }`}
            style={editMode ? {} : { borderWidth: "0.5px" }}
          >
            <PencilIcon />
            {editMode && <span>편집 모드</span>}
          </button>
          <button
            type="button"
            onClick={handleZipDownload}
            disabled={isZipping}
            className="flex h-[30px] items-center justify-center rounded-[4px] bg-[#f0f0f0] px-[10px] text-[10px] font-bold text-black transition hover:bg-[#e0e0e0] disabled:opacity-60"
          >
            {isZipping ? "Preparing..." : "ZIP Download"}
          </button>

          {/* Publish 버튼 + 드롭다운 패널 */}
          <div ref={publishRef} className="relative flex h-[30px] items-center">
            <button
              type="button"
              onClick={() => setIsPublishOpen((v) => !v)}
              className="flex h-[30px] items-center justify-center rounded-[4px] bg-[#29dea9] px-[10px] text-[10px] font-bold text-black transition hover:bg-[#22c896]"
            >
              Publish
            </button>

            {isPublishOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-[360px] flex-col gap-6 rounded-[10px] bg-black p-5 shadow-[0_0_20px_rgba(255,255,255,0.25)] max-h-[calc(100vh-80px)] overflow-y-auto">
                {/* 헤더 + 공개 범위 */}
                <div className="flex flex-col gap-3">
                  <p className="text-base font-bold text-white">퍼블리시 설정</p>
                  <div className="flex flex-col gap-2.5">
                    <p className="text-sm text-white">공개 범위</p>
                    <div className="flex gap-2.5">
                      {(
                        [
                          { key: "private", label: "비공개",   Icon: LockIcon  },
                          { key: "link",    label: "링크 공개", Icon: ShareIcon },
                          { key: "public",  label: "전체 공개", Icon: GlobeIcon },
                        ] as const
                      ).map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setVisibility(key)}
                          className={`flex h-[70px] w-[100px] flex-col items-center justify-center gap-0.5 rounded-[10px] border transition ${
                            visibility === key
                              ? "border-[#29dea9] bg-[rgba(41,222,169,0.15)] text-[#29dea9]"
                              : "border-[#606060] bg-[#242424] text-[#606060] hover:border-[#808080] hover:text-[#808080]"
                          }`}
                        >
                          <Icon />
                          <span className="text-[12px]">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 하단 버튼 영역 */}
                <div className="flex w-full flex-col gap-3">
                  {/* 게시된 URL 표시 */}
                  {isPublished && publishedUrl && (
                    <div className="flex flex-col gap-[6px]">
                      <p className="text-[11px] font-medium text-white/50">게시된 주소</p>
                      <div className="flex h-[38px] items-center gap-2 rounded-[8px] border border-[#2a2a2a] bg-[#141414] pl-3 pr-1.5">
                        <span className="flex-1 truncate font-mono text-[11px] leading-none text-white/55">
                          {publishedUrl}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          aria-label="링크 복사"
                          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[4px] text-white/40 transition hover:bg-white/10 hover:text-white/80"
                        >
                          {isCopied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    </div>
                  )}

                  {isPublished && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('preview', 'true');
                        window.open(
                          url.toString(),
                          '_blank',
                          `width=${window.screen.width},height=${window.screen.height},left=0,top=0`
                        );
                      }}
                      className="flex h-[35px] w-full items-center justify-center rounded-[5px] border border-white bg-transparent text-[10px] font-bold text-white transition hover:bg-white/10"
                    >
                      visit website →
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPublished && lastPublishedKey === previewKey}
                    onClick={handlePublish}
                    className={`flex h-[35px] w-full items-center justify-center rounded-[4px] text-[10px] font-bold transition ${
                      isPublished && lastPublishedKey === previewKey
                        ? "cursor-not-allowed bg-[#3a3a3a] text-white/30"
                        : "bg-[#29dea9] text-black hover:bg-[#22c896]"
                    }`}
                  >
                    {isPublished ? "변경사항 반영" : "Publish"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 프리뷰 / 코드 영역 ── */}
      <div ref={previewContainerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0f0f0f]">
      {tab === "preview" ? (
        viewMode === "mobile" ? (
          <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-[#0f0f0f]">
            <div
              className="[&_iframe]:block [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-none [&_iframe]:rounded-[20px]"
              style={{
                width: "375px",
                height: "min(812px, calc(100% - 32px))",
                borderRadius: "20px",
                overflow: "hidden",
                position: "relative",
                backgroundColor: "#000000",
                isolation: "isolate",
                border: "1px solid #2a2a2a",
              }}
            >
              <WebContainerPreview key={previewKey} project={project} editMode={editMode} onSectionClick={onSectionClick} />
            </div>
          </div>
        ) : (
          /* 데스크탑 뷰: 기존 full-width */
          <div className="mx-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9]/30">
            <WebContainerPreview key={previewKey} project={project} editMode={editMode} onSectionClick={onSectionClick} />
          </div>
        )
      ) : (
        <div className="mx-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[#d9d9d9]/30">
          <CodeWorkspace project={project} />
        </div>
      )}
      </div>
    </div>
  );
}
