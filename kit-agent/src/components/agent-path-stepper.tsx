"use client";

import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Compass, LineChart, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0 as const, label: "역량 진단", description: "프로필·준비도", Icon: Briefcase },
  { id: 1 as const, label: "탐색", description: "자료·요청", Icon: Compass },
  { id: 2 as const, label: "분석", description: "증류·요약", Icon: LineChart },
  { id: 3 as const, label: "보안검사", description: "무결성", Icon: ShieldCheck },
];

export function AgentPathStepper({
  currentStep,
  skillBump,
}: {
  currentStep: 0 | 1 | 2 | 3;
  skillBump?: { label: string; points: number } | null;
}) {
  return (
    <nav aria-label="에이전트 협업 단계" className="mx-auto w-full max-w-4xl px-1">
      <ol className="flex w-full items-center gap-0.5 sm:gap-1">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          const { Icon } = step;

          return (
            <Fragment key={step.id}>
              {index > 0 ? (
                <div
                  className={cn(
                    "h-0.5 min-w-[4px] flex-1 rounded-full sm:min-w-[8px]",
                    isDone ? "bg-[#58CC02]/45" : "bg-gray-100",
                  )}
                  aria-hidden
                />
              ) : null}

              <li className="min-w-0 flex-1">
                <motion.div
                  layout
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-2xl border-2 px-1.5 py-2.5 text-center sm:gap-1.5 sm:px-2 sm:py-3 md:px-3 md:py-4",
                    isActive &&
                      "border-[#1CB0F6] bg-[#1CB0F6]/[0.06] shadow-[0_0_0_1px_rgba(28,176,246,0.1)]",
                    isDone && !isActive && "border-gray-100 bg-[#F9FAFB] text-[#4B4B4B]/70",
                    !isActive && !isDone && "border-gray-100 bg-white",
                  )}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {isActive ? (
                    <motion.span
                      className="pointer-events-none absolute inset-0 rounded-2xl bg-[#1CB0F6]/10"
                      aria-hidden
                      animate={{ opacity: [0.35, 0.82, 0.35] }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    />
                  ) : null}

                  <span
                    className={cn(
                      "relative inline-flex size-9 items-center justify-center rounded-2xl border-2 sm:size-10 md:size-11",
                      isActive && "border-[#1CB0F6] bg-white text-[#1CB0F6]",
                      isDone && !isActive && "border-[#58CC02]/35 bg-white text-[#58CC02]",
                      !isActive && !isDone && "border-gray-100 bg-[#F9FAFB] text-gray-300",
                    )}
                  >
                    <Icon className="size-[18px] sm:size-5 md:size-[22px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                  </span>
                  <span className="relative z-[1] min-w-0">
                    <span
                      className={cn(
                        "block font-sans text-[10px] font-semibold tracking-tight sm:text-[11px] md:text-xs",
                        isActive && "text-[#1CB0F6]",
                        isDone && !isActive && "text-[#4B4B4B]/80",
                        !isActive && !isDone && "text-[#4B4B4B]/45",
                      )}
                    >
                      {step.id === 0 && isActive ? "역량 진단 중…" : step.label}
                    </span>
                    <span className="mt-0.5 hidden font-sans text-[8px] text-[#4B4B4B]/45 sm:block md:text-[9px]">
                      {step.description}
                    </span>
                  </span>
                </motion.div>
              </li>
            </Fragment>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        {skillBump ? (
          <motion.div
            key={`${skillBump.label}-${skillBump.points}`}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="mt-3 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#58CC02]/35 bg-[#58CC02]/10 px-4 py-2 font-sans text-xs font-bold text-[#3A8C02] shadow-sm">
              <span className="tabular-nums text-[#58CC02]">+{skillBump.points}</span>
              <span className="text-[#4B4B4B]">{skillBump.label}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#58CC02]/90">
                Growth
              </span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
