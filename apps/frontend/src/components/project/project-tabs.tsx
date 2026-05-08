"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { GeneratedProject, VariantBrief } from "@zeno/shared";

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
};

const EyeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const CodeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M16 18L22 12L16 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 6L2 12L8 18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ProjectTabs({ project, brief }: Props) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (brief?.productType === "app") {
      setViewMode("mobile");
    } else {
      setViewMode("desktop");
    }
  }, [brief?.productType]);

  return (
    <div className="flex h-full flex-col">
      {/* 상단 액션 바 */}
      <div className="flex h-[80px] shrink-0 items-center justify-end gap-2 px-5">
        <button
          type="button"
          onClick={() => setTab("preview")}
          aria-label="Preview"
          className={`flex h-[35px] w-[44px] items-center justify-center rounded-[5px] border transition ${
            tab === "preview"
              ? "border-white/30 bg-white/10 text-white"
              : "border-white/15 text-white/40 hover:border-white/25 hover:text-white/70"
          }`}
        >
          <EyeIcon />
        </button>

        <button
          type="button"
          onClick={() => setTab("code")}
          aria-label="Code"
          className={`flex h-[35px] items-center justify-center rounded-[5px] border px-[10px] transition ${
            tab === "code"
              ? "border-white/30 bg-white/10 text-white"
              : "border-white/15 text-white/40 hover:border-white/25 hover:text-white/70"
          }`}
        >
          <CodeIcon />
        </button>

        <button
          type="button"
          className="flex h-[35px] items-center justify-center rounded-[5px] bg-[#f0f0f0] px-[10px] text-[10px] font-bold text-black transition hover:bg-[#e0e0e0]"
        >
          ZIP Download
        </button>

        <button
          type="button"
          className="flex h-[35px] items-center justify-center rounded-[5px] bg-[#29dea9] px-[10px] text-[10px] font-bold text-black transition hover:bg-[#22c896]"
        >
          Publish
        </button>
      </div>

      {/* 프리뷰 / 코드 영역 */}
      <div className="mx-5 mb-5 flex flex-col min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#d9d9d9]/30">
        {tab === "preview" ? (
          <WebContainerPreview project={project} />
        ) : (
          <CodeWorkspace project={project} />
        )}
      </div>
    </div>
  );
}
