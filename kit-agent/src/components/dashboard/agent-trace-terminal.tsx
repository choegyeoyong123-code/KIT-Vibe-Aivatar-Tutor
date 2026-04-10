"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Terminal } from "lucide-react";
import type { FeedbackLogEntry } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/format-timestamp";

export function AgentTraceTerminal({
  orchestratorLines,
  traceUnified,
  className,
}: {
  orchestratorLines: string[];
  traceUnified: FeedbackLogEntry[];
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const orchEntries = useMemo(
    () =>
      orchestratorLines.map((message, i) => ({
        key: `orch-${i}-${message.slice(0, 40)}`,
        message,
        idx: i,
      })),
    [orchestratorLines],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [orchestratorLines, traceUnified]);

  return (
    <section
      className={cn(
        "border-border bg-[oklch(0.12_0.02_264)] text-zinc-200 shadow-[inset_0_1px_0_0_oklch(0.55_0.12_195/0.12)]",
        "flex min-h-[160px] shrink-0 flex-col border-t md:min-h-[200px]",
        className,
      )}
      aria-label="에이전트 통신 트레이스 터미널"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-zinc-800/90 px-3 py-2 font-mono text-[11px] tracking-wide text-cyan-400/95">
        <Terminal className="size-3.5 shrink-0" />
        <span className="uppercase">Agent Trace Terminal</span>
        <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300/95">
          <Radio className="size-3 animate-pulse" />
          live
        </span>
        <span className="ml-auto text-zinc-500">
          오케스트레이터 {orchestratorLines.length} · 트레이스 {traceUnified.length}
        </span>
      </header>
      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 font-mono text-[11px] leading-relaxed sm:text-xs"
      >
        <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
          Stream / 오케스트레이터
        </div>
        <ul className="mb-4 space-y-1 border-b border-zinc-800/80 pb-3">
          <AnimatePresence initial={false}>
            {orchEntries.length === 0 ? (
              <li className="text-zinc-500">대기 중 — 파이프라인 실행 시 실시간 라인이 표시됩니다.</li>
            ) : (
              orchEntries.map(({ key, message, idx }) => (
                <motion.li
                  key={key}
                  layout
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="break-words"
                >
                  <span className="text-zinc-500">{String(idx).padStart(3, "0")}</span>{" "}
                  <span className="text-fuchsia-400/90">ORCH</span>{" "}
                  <span className="text-zinc-100/90">{message}</span>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
        <div className="mb-2 text-[10px] uppercase tracking-wider text-zinc-500">
          에이전트 피드백 로그
        </div>
        <ul className="space-y-2 pr-1">
          <AnimatePresence initial={false}>
            {traceUnified.length === 0 ? (
              <li className="text-zinc-500">아직 트레이스가 없습니다.</li>
            ) : (
              traceUnified.map((entry, i) => (
                <motion.li
                  key={`${entry.at}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2 py-1.5"
                >
                  <div className="mb-0.5 flex flex-wrap gap-2 text-[10px] text-zinc-500">
                    <span>{formatTimestamp(entry.at)}</span>
                    <span className="text-cyan-400/85">{entry.phase}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-zinc-200/95">{entry.message}</p>
                </motion.li>
              ))
            )}
          </AnimatePresence>
        </ul>
        <div ref={endRef} />
      </div>
    </section>
  );
}
