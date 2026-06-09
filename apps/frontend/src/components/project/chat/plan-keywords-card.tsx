import type { PlanKeywordGroup } from "@zeno/shared";

const COLOR_MAP: Record<
  PlanKeywordGroup["color"],
  { text: string; bg: string; border: string }
> = {
  yellow: {
    text: "#f3d36b",
    bg: "rgba(243,211,107,0.1)",
    border: "rgba(243,211,107,0.5)",
  },
  blue: {
    text: "#a1b0eb",
    bg: "rgba(161,176,235,0.1)",
    border: "rgba(161,176,235,0.5)",
  },
  green: {
    text: "#9bdeba",
    bg: "rgba(155,222,186,0.1)",
    border: "rgba(155,222,186,0.5)",
  },
  pink: {
    text: "#d9a8c7",
    bg: "rgba(217,168,199,0.1)",
    border: "rgba(217,168,199,0.5)",
  },
};

type PlanKeywordsCardProps = {
  groups: PlanKeywordGroup[];
};

export default function PlanKeywordsCard({ groups }: PlanKeywordsCardProps) {
  if (!groups.length) return null;

  return (
    <div
      className="mt-5 flex flex-col gap-[14px] rounded-[10px] border px-[30px] py-[26px]"
      style={{
        background: "rgba(255,255,255,0.05)",
        borderColor: "rgba(255,255,255,0.2)",
        width: "fit-content",
        maxWidth: 430,
      }}
    >
      <p className="text-[16px] font-semibold leading-normal" style={{ color: "#29dea9" }}>
        기획 키워드
      </p>

      <div className="flex flex-col gap-[10px]">
        {groups.map((group) => {
          const c = COLOR_MAP[group.color];
          return (
            <div key={group.label} className="flex items-start gap-5">
              <p
                className="min-w-[60px] shrink-0 text-[14px] leading-[1.6] text-white"
              >
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-[50px] border px-[14px] py-[2px] text-[14px] font-semibold leading-[1.6] whitespace-nowrap"
                    style={{
                      color: c.text,
                      backgroundColor: c.bg,
                      borderColor: c.border,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
