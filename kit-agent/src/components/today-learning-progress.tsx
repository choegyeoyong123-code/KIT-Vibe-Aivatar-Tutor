"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function TodayLearningProgress({
  value,
  loading,
  className,
}: {
  /** 0–100 */
  value: number;
  loading?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-gray-100 bg-white p-4",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-sans text-sm font-semibold text-[#4B4B4B]">오늘의 학습 진행도</p>
        <span className="font-sans text-xs font-bold tabular-nums text-[#58CC02]">
          {Math.round(pct)}%
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {loading && !reduce ? (
          <motion.div
            className="h-full rounded-full bg-[#58CC02]"
            initial={{ width: "32%" }}
            animate={{ width: ["32%", "86%", "48%", "72%"] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full bg-[#58CC02]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        )}
      </div>
    </div>
  );
}
