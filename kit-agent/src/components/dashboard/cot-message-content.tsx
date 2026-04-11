"use client";

import { useMemo } from "react";
import { CotCodeBlock } from "@/components/dashboard/cot-code-block";
import { cn } from "@/lib/utils";

type Part =
  | { type: "text"; content: string }
  | { type: "code"; content: string; lang?: string };

export function parseFencedBlocks(raw: string): Part[] {
  const parts: Part[] = [];
  const re = /```([\w-]*)\r?\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", content: raw.slice(last, m.index) });
    }
    parts.push({
      type: "code",
      content: m[2],
      lang: m[1] || undefined,
    });
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    parts.push({ type: "text", content: raw.slice(last) });
  }
  if (parts.length === 0) {
    parts.push({ type: "text", content: raw });
  }
  return parts;
}

export function CotMessageContent({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const parts = useMemo(() => parseFencedBlocks(message), [message]);

  return (
    <div className={cn("space-y-2", className)}>
      {parts.map((p, i) =>
        p.type === "code" ? (
          <CotCodeBlock key={`c-${i}`} code={p.content} language={p.lang} />
        ) : (
          <p
            key={`t-${i}`}
            className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-slate-800 sm:text-sm"
          >
            {p.content}
          </p>
        ),
      )}
    </div>
  );
}
