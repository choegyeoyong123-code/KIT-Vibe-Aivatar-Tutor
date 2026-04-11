"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MessageSquareQuote, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentDebateCardProps = {
  agentA: { title: string; body: string };
  agentB: { title: string; body: string };
  agreed: { title: string; body: string };
  className?: string;
};

const cardBase =
  "flex min-h-[11rem] min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-[#FAFAFA] p-4 md:min-h-[13rem]";

/**
 * 좌 Agent A · 중앙 Agreed Solution · 우 Agent B (듀오링고식 답변 카드, 마스코트 없음)
 */
// OPTIMIZE: agentDebateContent 참조가 유지되는 동안 스트림 등으로 인한 부모 리렌더 시 불필요 페인트 방지
export const AgentDebateCard = memo(function AgentDebateCard({
  agentA,
  agentB,
  agreed,
  className,
}: AgentDebateCardProps) {
  return (
    <div className={cn("rounded-2xl border-2 border-gray-100 bg-white p-4 md:p-5", className)}>
      <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4B4B4B]/55">
        Agent Debate · 합의
      </p>

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[1fr_minmax(260px,1.35fr)_1fr] md:items-stretch md:gap-4">
        {/* Left — Agent A: Structure & Persona */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(cardBase, "border-gray-100 md:order-1")}
        >
          <div className="mb-2 flex flex-col gap-0.5 text-[#1CB0F6]">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="size-5 shrink-0" aria-hidden />
              <span className="font-sans text-xs font-bold uppercase tracking-wide">Agent A</span>
            </div>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wide text-[#4B4B4B]/60">
              Structure & Persona
            </span>
          </div>
          <p className="font-sans text-sm font-semibold text-[#4B4B4B]">{agentA.title}</p>
          <p className="mt-2 min-w-0 break-words font-sans text-sm leading-relaxed text-[#4B4B4B]/85">
            {agentA.body}
          </p>
        </motion.div>

        {/* Center — Agreed Solution (히어로) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 280, damping: 26 }}
          className={cn(
            cardBase,
            "relative border-[#58CC02] bg-[#58CC02]/[0.07] shadow-[0_8px_28px_-6px_rgba(88,204,2,0.22)] ring-2 ring-[#58CC02]/35 md:order-2 md:z-[2] md:-my-1 md:px-5",
          )}
        >
          <div className="mb-2 flex flex-col items-center justify-center gap-1 text-[#58CC02]">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-6 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="font-sans text-xs font-bold uppercase tracking-wide">Agreed Solution</span>
            </div>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/55">
              최종 합의안
            </span>
          </div>
          <p className="text-center font-sans text-base font-semibold text-[#4B4B4B]">{agreed.title}</p>
          <p className="mt-2 min-w-0 break-words text-center font-sans text-sm leading-relaxed text-[#4B4B4B]/90">
            {agreed.body}
          </p>
        </motion.div>

        {/* Right — Agent B: Evidence & Tone */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={cn(cardBase, "border-gray-100 md:order-3")}
        >
          <div className="mb-2 flex flex-col gap-0.5 text-[#1CB0F6]">
            <div className="flex items-center gap-2">
              <Scale className="size-5 shrink-0" aria-hidden />
              <span className="font-sans text-xs font-bold uppercase tracking-wide">Agent B</span>
            </div>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wide text-[#4B4B4B]/60">
              Evidence & Tone
            </span>
          </div>
          <p className="font-sans text-sm font-semibold text-[#4B4B4B]">{agentB.title}</p>
          <p className="mt-2 min-w-0 break-words font-sans text-sm leading-relaxed text-[#4B4B4B]/85">
            {agentB.body}
          </p>
        </motion.div>
      </div>
    </div>
  );
});
