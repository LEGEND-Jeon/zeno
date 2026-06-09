import type { Variant } from "@/shared";

type VariantCardGridProps = {
  variants: Variant[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
  onReselect: () => void;
};

type ThumbnailColors = { bg: string; bar1: string; bar2: string };

// 두 hex 컬러 사이의 유클리드 거리 (0~441)
function colorDistance(a: string, b: string): number {
  const parse = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as const;
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// 생성된 파일들에서 hex 컬러를 추출해 썸네일 팔레트를 반환
function extractThumbnailColors(project: Variant["project"]): ThumbnailColors {
  const hexPattern = /#([0-9A-Fa-f]{6})\b/g;
  const colorCounts = new Map<string, number>();

  for (const file of project.files) {
    hexPattern.lastIndex = 0;
    let match;
    while ((match = hexPattern.exec(file.content)) !== null) {
      const color = match[0].toLowerCase();
      const hex = parseInt(match[1], 16);
      const r = (hex >> 16) & 0xff;
      const g = (hex >> 8) & 0xff;
      const b = hex & 0xff;
      // 순수 흑/백에 가까운 색(명도 < 12 또는 > 243)은 건너뜀
      const brightness = (r + g + b) / 3;
      if (brightness < 12 || brightness > 243) continue;
      colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
    }
  }

  const sorted = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  // 이미 선택된 색과 충분히 다른(거리 > 40) 색만 골라 3개 확보
  const chosen: string[] = [];
  for (const color of sorted) {
    if (chosen.every((c) => colorDistance(c, color) > 40)) {
      chosen.push(color);
      if (chosen.length === 3) break;
    }
  }

  return {
    bg:   chosen[0] ?? "#1a1a1a",
    bar1: chosen[1] ?? "#ffffff",
    bar2: chosen[2] ?? "#888888",
  };
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 12L10 17L19 8"
      stroke="#29dea9"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function VariantCardGrid({
  variants,
  selectedVariantId,
  onSelect,
  onReselect,
}: VariantCardGridProps) {
  const hasSelection = selectedVariantId !== null;

  return (
    <div className="mt-5 space-y-4">
      {/* 가로 썸네일 카드 row */}
      <div className="flex gap-[10px]">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          const isDimmed = hasSelection && !isSelected;
          const colors = extractThumbnailColors(variant.project);

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              className={`flex w-[100px] flex-col overflow-hidden rounded-[10px] transition-all ${
                isSelected
                  ? "border-2 border-[#29dea9]"
                  : isDimmed
                    ? "cursor-default border border-white/20 opacity-40"
                    : "border border-white/20 hover:border-[#29dea9]/60 hover:opacity-90"
              }`}
            >
              {/* 썸네일 프리뷰 */}
              <div
                className="flex h-[70px] w-full flex-col gap-[7px] pb-[40px] pl-[10px] pr-[10px] pt-[12px]"
                style={{ backgroundColor: colors.bg }}
              >
                <div
                  className="h-[4px] w-[70px] rounded-[140px]"
                  style={{ backgroundColor: colors.bar1 }}
                />
                <div
                  className="h-[4px] w-[50px] rounded-[140px]"
                  style={{ backgroundColor: colors.bar2 }}
                />
              </div>

              {/* 카드 이름 */}
              <div className="flex min-h-[40px] w-full items-center justify-center gap-[4px] bg-black px-[8px] py-[6px]">
                <span className="text-center text-[11px] leading-[1.4] text-white">
                  {variant.brief.styleKeywords[0] ?? variant.name}
                </span>
                {isSelected && <CheckIcon />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 시안 다시 선택하기 버튼 */}
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
