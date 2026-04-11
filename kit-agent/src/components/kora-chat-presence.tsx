"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type KoraChatMood = "idle" | "thinking" | "answering" | "praising";

const LABEL: Record<KoraChatMood, string> = {
  idle: "학습 준비 완료",
  thinking: "생각 중…",
  answering: "답변 작성 중…",
  praising: "잘하고 있어요!",
};

const easeSoft = [0.4, 0, 0.2, 1] as const;

function moodMotion(mood: KoraChatMood): {
  animate: { y?: number[]; rotate?: number[]; scale?: number[] };
  transition: { duration: number; repeat: number; ease: typeof easeSoft };
} {
  switch (mood) {
    case "idle":
      return {
        animate: { y: [0, -3, 0] },
        transition: { duration: 4, repeat: Infinity, ease: easeSoft },
      };
    case "thinking":
      return {
        animate: { rotate: [-2, 2, -2], y: [0, -1, 0] },
        transition: { duration: 2.2, repeat: Infinity, ease: easeSoft },
      };
    case "answering":
      return {
        animate: { y: [0, -4, -2, 0], scale: [1, 1.02, 1] },
        transition: { duration: 1.4, repeat: Infinity, ease: easeSoft },
      };
    case "praising":
      return {
        animate: { y: [0, -6, 0], rotate: [0, -3, 3, 0] },
        transition: { duration: 1.8, repeat: Infinity, ease: easeSoft },
      };
    default:
      return {
        animate: { y: [0, -3, 0] },
        transition: { duration: 4, repeat: Infinity, ease: easeSoft },
      };
  }
}

export function KoraChatPresence({
  mood,
  className,
}: {
  mood: KoraChatMood;
  className?: string;
}) {
  const { animate, transition } = moodMotion(mood);

  return (
    <div
      className={cn(
        "flex shrink-0 gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-3 shadow-sm",
        className,
      )}
    >
      <div className="relative size-[72px] shrink-0 sm:size-[84px]">
        <motion.div className="relative size-full" animate={animate} transition={transition}>
          <Image
            src="/images/image_12.png"
            alt=""
            fill
            className="object-contain object-center drop-shadow-sm"
            sizes="84px"
            priority={false}
          />
        </motion.div>
        {mood === "thinking" ? (
          <motion.span
            className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-[10px] font-bold text-cyan-700 shadow-sm"
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1, 0.95] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            aria-hidden
          >
            ···
          </motion.span>
        ) : null}
        {mood === "praising" ? (
          <motion.span
            className="pointer-events-none absolute -right-1 top-1 text-lg"
            initial={{ opacity: 0, y: 4, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            aria-hidden
          >
            ✨
          </motion.span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Kora · AI 튜터
        </p>
        <p className="font-sans text-sm font-medium leading-snug text-slate-800">{LABEL[mood]}</p>
        <p className="font-sans text-[11px] leading-relaxed text-slate-500">
          {mood === "idle"
            ? "자료를 올리고 실행하면 요약이 이곳에 스트리밍됩니다."
            : mood === "thinking"
              ? "지식을 증류하고 핵심을 정리하고 있어요."
              : mood === "answering"
                ? "문장을 이어 붙이며 노트를 완성하고 있어요."
                : "학습 흐름이 안정적으로 이어지고 있어요."}
        </p>
      </div>
    </div>
  );
}

export function deriveKoraMood(args: {
  loading: boolean;
  summaryText: string;
  hasFinalSummary: boolean;
  qualityScore: number | null | undefined;
}): KoraChatMood {
  const { loading, summaryText, hasFinalSummary, qualityScore } = args;
  const hasText = summaryText.trim().length > 0;
  if (loading && !hasText) return "thinking";
  if (loading && hasText) return "answering";
  if (!loading && hasFinalSummary) {
    const q = qualityScore ?? 0;
    if (Number.isFinite(q) && q >= 7) return "praising";
  }
  return "idle";
}
