"use client";

import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Compass, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "탐색", Icon: Compass },
  { label: "분석", Icon: LineChart },
  { label: "결론", Icon: CheckCircle2 },
] as const;

/** 0–1 → 탐색, 2 → 분석, 3 → 결론 */
function activeCollaborationIndex(agentPathStep: 0 | 1 | 2 | 3): number {
  if (agentPathStep <= 1) return 0;
  if (agentPathStep === 2) return 1;
  return 2;
}

/**
 * 채팅 상단용 소형 스테퍼 — 현재 단계만 `animate-pulse`.
 */
export function CollaborationPathStepper({
  agentPathStep,
  skillBump,
  className,
}: {
  agentPathStep: 0 | 1 | 2 | 3;
  skillBump?: { label: string; points: number } | null;
  className?: string;
}) {
  const activeIdx = activeCollaborationIndex(agentPathStep);

  return (
    <nav
      aria-label="에이전트 협업 단계: 탐색, 분석, 결론"
      className={cn("w-full shrink-0 border-b border-gray-100 bg-white/80 px-4 py-2.5 sm:px-6", className)}
    >
      <ol className="mx-auto flex max-w-3xl items-center justify-center gap-0.5 sm:gap-1">
        {STEPS.map((step, i) => {
          const { Icon } = step;
          const active = i === activeIdx;
          const done = i < activeIdx;
          return (
            <Fragment key={step.label}>
              {i > 0 ? (
                <ChevronRight
                  className="size-3.5 shrink-0 text-gray-300 sm:size-4"
                  aria-hidden
                />
              ) : null}
              <li className="flex min-w-0 items-center gap-1 rounded-full border border-gray-100 bg-[#FAFAFA] px-2 py-1 sm:gap-1.5 sm:px-2.5 sm:py-1.5">
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-white sm:size-7",
                    done && "border-emerald-400 text-emerald-600",
                    active && "border-[#1CB0F6] text-[#1CB0F6] shadow-sm",
                    !active && !done && "border-gray-100 text-gray-300",
                    active && "animate-pulse",
                  )}
                >
                  <Icon className="size-3 sm:size-3.5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                </span>
                <span
                  className={cn(
                    "truncate font-sans text-[9px] font-semibold sm:text-[11px]",
                    active ? "text-[#1CB0F6]" : done ? "text-[#4B4B4B]/80" : "text-[#4B4B4B]/40",
                  )}
                >
                  {step.label}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        {skillBump ? (
          <motion.div
            key={`${skillBump.label}-${skillBump.points}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="mt-2 flex justify-center"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#58CC02]/35 bg-[#58CC02]/10 px-3 py-1 font-sans text-[10px] font-bold text-[#3A8C02] sm:text-xs">
              <span className="tabular-nums text-[#58CC02]">+{skillBump.points}</span>
              <span className="max-w-[12rem] truncate text-[#4B4B4B]">{skillBump.label}</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
