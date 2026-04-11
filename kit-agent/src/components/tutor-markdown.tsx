"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { CotCodeBlock } from "@/components/dashboard/cot-code-block";
import { cn } from "@/lib/utils";

function CodeRenderer({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const match = /language-(\w+)/.exec(className ?? "");
  const codeString = String(children ?? "").replace(/\n$/, "");
  if (match) {
    return <CotCodeBlock code={codeString} language={match[1]} />;
  }
  return (
    <code
      className={cn(
        "rounded-md bg-gray-200/90 px-1.5 py-0.5 font-mono text-[0.88em] text-[#4B4B4B]",
        className,
      )}
    >
      {children}
    </code>
  );
}

/** AI 튜터 답변용 — 흰 말풍선 안 가독성 (차콜 본문) */
export function TutorMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tutor-md min-w-0 max-w-full overflow-x-auto text-sm leading-relaxed text-[#4B4B4B] break-words",
        "[&_h1]:pt-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-[#4B4B4B]",
        "[&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#4B4B4B]",
        "[&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-[#4B4B4B]",
        "[&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-[#4B4B4B]",
        "[&_a]:text-[#1CB0F6] [&_a]:underline [&_a]:underline-offset-2",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3 [&_blockquote]:text-[#4B4B4B]/90",
        "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse",
        "[&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1",
        "[&_th]:border [&_th]:border-gray-200 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
        className,
      )}
    >
      <ReactMarkdown
        components={{
          pre: ({ children: c }) => <>{c}</>,
          code: CodeRenderer,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
