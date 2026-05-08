import type { Variant } from "@zeno/shared";

type VariantCardGridProps = {
  variants: Variant[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
  onReselect: () => void;
};

export default function VariantCardGrid({
  variants,
  selectedVariantId,
  onSelect,
  onReselect,
}: VariantCardGridProps) {
  const hasSelection = selectedVariantId !== null;

  return (
    <div className="mt-5 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          const isDimmed = hasSelection && !isSelected;
          const keywords = variant.brief.styleKeywords.length
            ? variant.brief.styleKeywords
            : variant.brief.moodKeywords;

          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant.id)}
              className={`flex flex-col gap-2 rounded-[16px] border p-3 text-left transition-all ${
                isSelected
                  ? "border-[#80f3c9]/55 bg-[#80f3c9]/12"
                  : isDimmed
                    ? "cursor-default border-white/6 bg-white/4 opacity-40"
                    : "border-white/10 bg-white/6 hover:border-[#80f3c9]/40 hover:bg-[#80f3c9]/8"
              }`}
            >
              {/* A/B/C/D 라벨 */}
              <span
                className={`inline-flex h-6 w-6 items-center justify-center self-start rounded-full border text-[11px] font-bold ${
                  isSelected
                    ? "border-[#80f3c9]/70 bg-[#80f3c9]/22 text-[#baf8df]"
                    : "border-white/18 bg-black/18 text-white/60"
                }`}
              >
                {variant.brief.variantId}
              </span>

              {/* 시안 이름 */}
              <p className="text-[13px] font-semibold leading-5 text-white/90">
                {variant.name}
              </p>

              {/* 한 줄 요약 */}
              <p className="text-[12px] leading-[1.5] text-white/52">
                {variant.summary}
              </p>

              {/* 스타일 + 키워드 배지 */}
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                  {variant.brief.compositionStyle}
                </span>
                {keywords.slice(0, 2).map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-white/7 px-2 py-0.5 text-[10px] text-white/46"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {hasSelection && (
        <button
          type="button"
          onClick={onReselect}
          className="w-full rounded-[12px] border border-white/16 py-2.5 text-[13px] font-medium text-white/60 transition hover:border-white/30 hover:text-white/80"
        >
          시안 다시 선택하기
        </button>
      )}
    </div>
  );
}
