"use client";

import { useMemo, useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/github.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);

function pickLanguage(lang: string | undefined): string {
  if (!lang) return "typescript";
  const normalized = lang.toLowerCase().replace(/^language-/, "");
  if (hljs.getLanguage(normalized)) return normalized;
  if (normalized === "tsx" || normalized === "jsx") return "typescript";
  return hljs.getLanguage("typescript") ? "typescript" : "javascript";
}

/** 연한 회색 박스 + 사이안 복사 버튼 */
export function CotCodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.trimEnd();

  const html = useMemo(() => {
    if (!trimmed) return "";
    try {
      const lang = pickLanguage(language);
      return hljs.highlight(trimmed, { language: lang, ignoreIllegals: true }).value;
    } catch {
      return hljs.highlightAuto(trimmed).value;
    }
  }, [trimmed, language]);

  const onCopy = () => {
    void navigator.clipboard.writeText(trimmed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "my-2 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100/90",
        className,
      )}
    >
      <div className="flex items-center justify-end border-b border-gray-200/90 px-2 py-1.5">
        <Button type="button" variant="cyanTactile" size="xs" className="h-7 px-3 text-xs" onClick={onCopy}>
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed">
        <code
          className="hljs font-mono text-[11px] text-[#24292f] sm:text-xs"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
