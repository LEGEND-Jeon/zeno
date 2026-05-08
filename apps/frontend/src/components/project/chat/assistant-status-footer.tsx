import type { ReactNode } from "react";

type AssistantStatusFooterProps = {
  tone?: "default" | "warning" | "danger";
  children: ReactNode;
};

export default function AssistantStatusFooter({
  tone = "default",
  children,
}: AssistantStatusFooterProps) {
  const toneClassName =
    tone === "danger"
      ? "text-rose-200/88"
      : tone === "warning"
        ? "text-amber-100/82"
        : "text-white/58";

  return (
    <div className={`mt-4 text-[13px] leading-6 ${toneClassName}`}>
      {children}
    </div>
  );
}
