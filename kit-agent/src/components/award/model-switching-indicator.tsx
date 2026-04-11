"use client";

import { motion } from "framer-motion";
import { Cpu, Leaf, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModelTier = "high" | "eco";

export function ModelSwitchingIndicator({
  tier,
  savingsScorePct,
  savingsUsd,
  loading,
  className,
}: {
  tier: ModelTier;
  /** 0–100 게임 스코어 느낌의 절감 효율 */
  savingsScorePct: number;
  savingsUsd: number;
  loading?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, savingsScorePct));
  const isHigh = tier === "high";

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-gray-100 bg-white px-4 py-3 shadow-none md:px-5 md:py-4",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-2xl border-2 px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-wide",
              isHigh
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-[#58CC02]/10 text-[#3a9e02]",
            )}
          >
            {isHigh ? (
              <Cpu className="size-4 shrink-0" aria-hidden />
            ) : (
              <Leaf className="size-4 shrink-0" aria-hidden />
            )}
            {isHigh ? "High" : "Eco"}
          </span>
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4B4B4B]/55">
              모델 · 실시간 절감 스코어
            </p>
            <p className="font-sans text-sm font-semibold text-[#4B4B4B]">
              {isHigh ? "고품질 멀티모달" : "비용 최적 Eco 라우팅"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-sans text-sm font-bold tabular-nums text-[#58CC02]">
          <TrendingDown className="size-4 shrink-0" aria-hidden />
          <span>
            ${savingsUsd.toFixed(2)}{" "}
            <span className="text-xs font-semibold text-[#4B4B4B]/60">절약(추정)</span>
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-sans text-[11px] font-semibold text-[#4B4B4B]/70">효율 점수</span>
          <span className="font-sans text-xs font-bold tabular-nums text-[#58CC02]">{Math.round(pct)}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          {loading ? (
            <motion.div
              className="h-full rounded-full bg-[#58CC02]"
              initial={{ width: "20%" }}
              animate={{ width: ["22%", "78%", "45%", "60%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
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
    </div>
  );
}
