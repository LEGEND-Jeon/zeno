import type { ProjectMessage } from "@zeno/shared";

export default function UserMessage({ message }: { message: ProjectMessage }) {
  return (
    <div className="ml-auto max-w-[400px] rounded-[12px] bg-white/20 px-4 py-3 text-[16px] leading-[1.7] text-white shadow-[0_0_10px_rgba(255,255,255,0.14)]">
      <p className="whitespace-pre-wrap">{message.content}</p>
    </div>
  );
}
