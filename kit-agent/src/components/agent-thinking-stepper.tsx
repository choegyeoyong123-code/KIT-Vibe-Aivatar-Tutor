"use client";

import { motion } from "framer-motion";
import { BookOpen, FlaskConical, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NODES = [
  { key: "distill", label: "요약", Icon: BookOpen },
  { key: "validate", label: "검증", Icon: FlaskConical },
  { key: "tutor", label: "톤", Icon: Sparkles },
] as const;

/** -1 = 전체 완료, 0–2 = 현재 초점 인덱스 */
function focusIndex(loading: boolean, agentPathStep: 0 | 1 | 2 | 3): number {
  if (!loading && agentPathStep >= 3) return -1;
  if (loading) {
    if (agentPathStep <= 1) return 0;
    if (agentPathStep === 2) return 1;
    return 2;
  }
  if (agentPathStep <= 1) return 0;
  return 1;
}

export function AgentThinkingStepper({
  loading,
  agentPathStep,
  className,
}: {
  loading: boolean;
  agentPathStep: 0 | 1 | 2 | 3;
  className?: string;
}) {
  const focus = focusIndex(loading, agentPathStep);
  const allDone = focus === -1;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-gray-100 bg-white px-3 py-2.5 sm:gap-3 sm:px-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="에이전트 협업 단계"
    >
      {NODES.map((n, i) => {
        const Icon = n.Icon;
        const pulsing = loading && focus === i;
        const done = allDone || i < focus;
        const current = !allDone && focus === i;
        const waiting = !allDone && !done && !current;

        return (
          <div key={n.key} className="flex items-center gap-2 sm:gap-2.5">
            {i > 0 ? (
              <span className="font-sans text-[10px] font-medium text-gray-200" aria-hidden>
                →
              </span>
            ) : null}
            <motion.div
              className={cn(
                "flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2",
                allDone && "border-emerald-300 bg-emerald-50/60",
                pulsing && "border-[#1CB0F6] bg-[#1CB0F6]/[0.06]",
                done && !allDone && "border-emerald-100 bg-white",
                current && !pulsing && "border-gray-200 bg-[#FAFAFA]",
                waiting && "border-gray-100 bg-[#FAFAFA]/80",
              )}
              animate={pulsing ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 1.5, repeat: pulsing ? Infinity : 0, ease: "easeInOut" }}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-lg border-2 sm:size-8",
                  allDone && "border-emerald-400 text-emerald-600",
                  pulsing && "border-[#1CB0F6] bg-white text-[#1CB0F6] animate-pulse",
                  done && !allDone && "border-emerald-200 text-emerald-600",
                  current && !pulsing && "border-gray-200 text-[#4B4B4B]/70",
                  waiting && "border-gray-100 text-gray-300",
                )}
              >
                <Icon className="size-3.5 sm:size-4" strokeWidth={pulsing || allDone ? 2.25 : 1.75} aria-hidden />
              </span>
              <span
                className={cn(
                  "font-sans text-[10px] font-semibold sm:text-xs",
                  allDone && "text-emerald-800",
                  pulsing && "text-[#1CB0F6]",
                  done && !allDone && "text-emerald-700",
                  current && !pulsing && "text-[#4B4B4B]/75",
                  waiting && "text-[#4B4B4B]/38",
                )}
              >
                {n.label}
              </span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
