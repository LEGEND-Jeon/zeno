"use client";
import ZenoMark from "@/components/home/zeno-mark";

const EyeIcon = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <rect x="4" y="4" width="10" height="4" rx="1" fill="currentColor" opacity="0.5" />
  </svg>
);

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M16 18L22 12L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MobileIcon = () => (
  <svg width="14" height="20" viewBox="0 0 14 22" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="12" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="7" cy="18.5" r="1" fill="currentColor" opacity="0.6" />
  </svg>
);

const ExpandCollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="-rotate-90">
    <path d="M5 9L12 16L19 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 15L12 8L19 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function GenerationLoading() {
  return (
    <div className="flex h-full flex-col bg-[#0f0f0f]">
      {/* 탑바 */}
      <div className="flex h-[60px] shrink-0 items-center gap-5 px-2">
        <div className="flex shrink-0 items-center gap-[12px]">
          <div className="flex h-6 w-6 items-center justify-center text-white/20">
            <ExpandCollapseIcon />
          </div>
          <div className="flex h-6 w-6 items-center justify-center text-white/20">
            <MobileIcon />
          </div>
        </div>

        <div className="flex flex-1 items-center gap-[6px]">
          <div
            className="flex h-[30px] w-[40px] items-center justify-center rounded-[4px] border border-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.2)] text-white"
            style={{ borderWidth: "0.5px" }}
          >
            <EyeIcon />
          </div>
          <div
            className="flex h-[30px] w-[40px] items-center justify-center rounded-[4px] border border-[rgba(255,255,255,0.4)] text-white/40"
            style={{ borderWidth: "0.5px" }}
          >
            <CodeIcon />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-[10px]">
          <div className="flex h-[30px] items-center justify-center rounded-[4px] bg-[#f0f0f0] px-[10px] text-[10px] font-bold text-black opacity-30 cursor-not-allowed">
            ZIP Download
          </div>
          <div className="flex h-[30px] items-center justify-center rounded-[4px] bg-[#29dea9] px-[10px] text-[10px] font-bold text-black opacity-30 cursor-not-allowed">
            Publish
          </div>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="mx-5 mb-5 flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[20px] border border-[#606060] bg-black">
        <div className="flex flex-col items-center gap-[50px]">
          <ZenoMark shimmer className="h-[34px] w-[36px]" />

          <div className="flex flex-col items-center gap-[16px] text-center">
            <p className="text-[34px] font-bold leading-normal text-white">
              제노가 시안을 디자인하고 있어요.
            </p>
            <p className="text-[16px] leading-normal text-[#797979]">
              4가지 방향의 랜딩페이지를 만드는 중이에요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
