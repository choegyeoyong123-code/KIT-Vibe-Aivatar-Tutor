"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Radio, Sparkles, Terminal, Workflow } from "lucide-react";
import type { FeedbackLogEntry } from "@/lib/agent/types";
import { CotMessageContent } from "@/components/dashboard/cot-message-content";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/format-timestamp";
import { presentPhase } from "@/lib/dashboard/agent-phase-presenter";

const ROTATING_HINT_KEYS = [
  "cfo",
  "distill",
  "validate",
  "consensus",
  "protocol",
] as const;

export function AgentTraceTerminal({
  orchestratorLines,
  traceUnified,
  pipelineActive = false,
  className,
}: {
  orchestratorLines: string[];
  traceUnified: FeedbackLogEntry[];
  /** 파이프라인 실행 중 — 하단에 CoT 스켈레톤·힌트 표시 */
  pipelineActive?: boolean;
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [hintIdx, setHintIdx] = useState(0);

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
  }, [orchestratorLines, traceUnified, pipelineActive, hintIdx]);

  useEffect(() => {
    if (!pipelineActive) return;
    const t = window.setInterval(() => {
      setHintIdx((n) => (n + 1) % ROTATING_HINT_KEYS.length);
    }, 2800);
    return () => window.clearInterval(t);
  }, [pipelineActive]);

  const skeletonHint = useMemo(() => {
    const k = ROTATING_HINT_KEYS[hintIdx];
    return presentPhase(k).thinkingHint;
  }, [hintIdx]);

  return (
    <section
      className={cn(
        "flex min-h-[200px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white text-slate-800 shadow-sm",
        className,
      )}
      aria-label="멀티 에이전트 사고 흐름 · 트레이스"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-5 py-3.5">
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide text-cyan-700">
          <Terminal className="size-3.5 shrink-0" aria-hidden />
          <span className="uppercase">Agent CoT Stream</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-800">
          <Brain className="size-3" aria-hidden />
          thinking
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 font-mono text-[10px] text-fuchsia-800">
          <Workflow className="size-3" aria-hidden />
          오케스트레이터 {orchestratorLines.length}
        </span>
        <span className="ml-auto font-mono text-[10px] text-slate-500">
          트레이스 {traceUnified.length}
        </span>
      </header>

      <div
        ref={viewportRef}
        className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5"
      >
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <Radio className="size-3 animate-pulse text-cyan-600" aria-hidden />
            오케스트레이터 스트림
          </div>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {orchEntries.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center font-sans text-xs text-slate-600">
                  대기 중 — 파이프라인을 실행하면 라인이 카드로 쌓입니다.
                </li>
              ) : (
                orchEntries.map(({ key, message, idx }) => (
                  <motion.li
                    key={key}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-fuchsia-50 to-white p-3 shadow-sm"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-fuchsia-800">
                        <Sparkles className="size-3" aria-hidden />
                        ORCH
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                        #{String(idx).padStart(3, "0")}
                      </span>
                    </div>
                    <CotMessageContent
                      message={message}
                      className="[&_p]:font-mono [&_p]:text-[11px] [&_p]:text-slate-800"
                    />
                  </motion.li>
                ))
              )}
            </AnimatePresence>
          </ul>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            에이전트 사고 흐름 (Chain of Thought)
          </div>
          <ul className="space-y-3 pr-0.5">
            <AnimatePresence initial={false}>
              {traceUnified.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center font-sans text-xs text-slate-600">
                  아직 피드백 로그가 없습니다. 실행 후 각 에이전트의 메시지가 카드로 표시됩니다.
                </li>
              ) : (
                traceUnified.map((entry, i) => {
                  const meta = presentPhase(entry.phase);
                  return (
                    <motion.li
                      key={`${entry.at}-${i}`}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br p-3 shadow-sm",
                        meta.accent,
                      )}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7)_0%,transparent_50%)]"
                        aria-hidden
                      />
                      <div className="relative mb-2 flex flex-wrap items-start justify-between gap-2 border-b border-slate-100/80 pb-2">
                        <div>
                          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-800">
                            {meta.agentRole}
                          </p>
                          <p className="mt-0.5 font-sans text-[10px] text-slate-600">
                            {meta.labelKo} · {entry.phase}
                          </p>
                        </div>
                        <time
                          className="font-mono text-[10px] tabular-nums text-slate-500"
                          dateTime={entry.at}
                        >
                          {formatTimestamp(entry.at)}
                        </time>
                      </div>
                      <CotMessageContent message={entry.message} />
                    </motion.li>
                  );
                })
              )}
            </AnimatePresence>
          </ul>
        </div>

        <AnimatePresence>
          {pipelineActive ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
                  다음 단계 추론 중
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 w-[42%] animate-pulse rounded-md bg-emerald-200/80" />
                <div className="h-2 w-full animate-pulse rounded-md bg-slate-200" />
                <div className="h-2 w-[88%] animate-pulse rounded-md bg-slate-200/80" />
                <div className="h-2 w-[72%] animate-pulse rounded-md bg-slate-200/60" />
              </div>
              <p className="mt-4 font-sans text-[11px] leading-relaxed text-emerald-900/90">
                {skeletonHint}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div ref={endRef} />
      </div>
    </section>
  );
}
