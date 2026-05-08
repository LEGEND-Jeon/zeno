import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const assistantMarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="whitespace-pre-wrap text-[15px] leading-7 text-white/88">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-white/94">{children}</em>,
  ul: ({ children }) => (
    <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/78 marker:text-white/50">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-7 text-white/78 marker:text-white/50">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-[#8ef4cb] underline decoration-[#8ef4cb]/45 underline-offset-4 transition hover:text-[#baf8df] hover:decoration-[#baf8df]/70"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#80f3c9]/35 pl-4 text-[15px] leading-7 text-white/70 italic">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="text-[24px] font-semibold leading-8 text-white">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[21px] font-semibold leading-8 text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[18px] font-semibold leading-7 text-white/96">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[16px] font-semibold leading-7 text-white/94">
      {children}
    </h4>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-[20px] border border-white/10 bg-black/26 px-4 py-3 font-mono text-[13px] leading-6 text-white/84">
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock =
      typeof className === "string" && className.includes("language-");

    if (isBlock) {
      return (
        <code
          className={`${className} font-mono text-[13px] leading-6 text-white/84`}
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[0.95em] text-[#baf8df]"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-[18px] border border-white/10 bg-black/12">
      <table className="min-w-full border-collapse text-left text-[14px] leading-6 text-white/82">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/6">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-t border-white/8">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-white/90">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-white/76">{children}</td>,
  input: ({ checked, disabled, type }) => {
    if (type !== "checkbox") {
      return null;
    }

    return (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled ?? true}
        readOnly
        className="mr-2 size-4 rounded border-white/20 bg-white/8 accent-[#80f3c9]"
      />
    );
  },
};

export default function AssistantMarkdownContent({
  content,
}: {
  content: string;
}) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div className="mt-3 [&>*+*]:mt-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={assistantMarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
