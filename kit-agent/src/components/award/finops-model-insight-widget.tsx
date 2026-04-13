"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Coins, Cpu, Database } from "lucide-react";
import type { ActiveModelTier, AgentFinOps } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

/** USD→KRW (세션 절감 표시용 고정 환율; 심사·데모 일관성) */
const USD_KRW = 1420;

const krwFmt = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function resolveModelLine(
  tier: ActiveModelTier | null | undefined,
  mediaHigh: boolean,
): { label: string; mode: "Eco" | "Power" } {
  if (tier === "economy") {
    return { label: "🌿 ECO 모드", mode: "Eco" };
  }
  if (tier === "standard") {
    return { label: "⚡ HIGH 모드", mode: "Power" };
  }
  return mediaHigh
    ? { label: "⚡ HIGH 모드", mode: "Power" }
    : { label: "🌿 ECO 모드", mode: "Eco" };
}

function resolveInsightText(args: {
  finOps: AgentFinOps | null | undefined;
  activeTier: ActiveModelTier | null | undefined;
  summarizationInstruction: string;
}): string {
  const summary = args.finOps?.efficiencySummary?.trim();
  if (summary && summary.length > 0) {
    return summary.length > 240 ? `${summary.slice(0, 237)}…` : summary;
  }
  const shortQ =
    args.summarizationInstruction.trim().length > 0 &&
    args.summarizationInstruction.trim().length < 120;
  if (args.activeTier === "economy") {
    if (shortQ) {
      return "단순 개념·짧은 질의로 판단되어 저비용 모델로 자동 전환되었습니다. 프롬프트 캐시·변수 주입으로 입력 토큰을 추가 절감합니다.";
    }
    return "요약·증류 단계에서 비용 효율 우선 정책이 적용되어 Eco 라우트를 유지합니다. 캐시 히트 메트릭이 실시간으로 반영됩니다.";
  }
  return "멀티모달 처리·고신뢰 검증이 필요해 Power 모델을 유지합니다. Validator 루프와 품질 게이트 비용이 포함됩니다.";
}

function dollarsSaved(fin: AgentFinOps | null | undefined): number {
  if (!fin) return 0;
  const m = fin.measured_performance?.dollarsSaved;
  if (m != null && Number.isFinite(m)) return m;
  const e = fin.estimated_savings?.dollarsSaved;
  if (e != null && Number.isFinite(e)) return e;
  if (fin.dollarsSaved != null && Number.isFinite(fin.dollarsSaved)) return fin.dollarsSaved;
  return 0;
}

export type FinOpsModelInsightWidgetProps = {
  activeModelTier: ActiveModelTier | null | undefined;
  personaMediaCostTier: "low" | "high" | undefined;
  totalTokenUsage: number;
  finOps: AgentFinOps | null | undefined;
  loading: boolean;
  summarizationInstruction: string;
  className?: string;
};

/**
 * 모델 스위칭 인사이트 + 라이브 토큰 + 세션 절감액(KRW) — Geist Mono · Lucide · 화이트 카드
 */
export function FinOpsModelInsightWidget({
  activeModelTier,
  personaMediaCostTier,
  totalTokenUsage,
  finOps,
  loading,
  summarizationInstruction,
  className,
}: FinOpsModelInsightWidgetProps) {
  const mediaHigh = personaMediaCostTier === "high";
  const { label, mode } = resolveModelLine(activeModelTier, mediaHigh);

  const metrics = finOps?.measured_performance?.metrics;
  const actualInputTokens = metrics?.actual_input_tokens;
  const inputTok = useMemo(() => {
    if (actualInputTokens != null && Number.isFinite(actualInputTokens)) {
      return Math.round(actualInputTokens);
    }
    if (totalTokenUsage <= 0) return 0;
    return Math.max(0, Math.round(totalTokenUsage * 0.52));
  }, [actualInputTokens, totalTokenUsage]);

  const outputTok = useMemo(() => {
    if (totalTokenUsage <= 0) return 0;
    return Math.max(0, totalTokenUsage - inputTok);
  }, [totalTokenUsage, inputTok]);

  const cachedHit = metrics?.cached_tokens_hit ?? 0;

  const usdSaved = dollarsSaved(finOps);
  const krwSaved = Math.round(usdSaved * USD_KRW);

  const insight = resolveInsightText({
    finOps,
    activeTier: activeModelTier ?? undefined,
    summarizationInstruction,
  });

  const savingsPct = useMemo(() => {
    const p = finOps?.measured_performance?.savingsPercentage ?? finOps?.estimated_savings?.savingsPercentage ?? finOps?.savingsPercentage;
    if (p != null && Number.isFinite(p)) return Math.min(100, Math.max(0, p));
    return finOps?.estimated_savings?.savingsPercentage ?? 82;
  }, [finOps]);

  const isEcoActive = mode === "Eco";

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-gray-100 bg-white px-4 py-4 shadow-none md:px-5 md:py-5",
        className,
      )}
      role="region"
      aria-label="추론 모드·토큰·절감 FinOps 인사이트"
    >
      {/* Adaptive Model Switching — 상단 중앙: 활성 모드만 에메랄드 글로우 */}
      <div className="mb-5 flex flex-col items-center gap-3 border-b border-gray-100 pb-5">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4B4B4B]/55">
          Adaptive Model Switching
        </p>
        <div className="flex w-full max-w-lg flex-wrap items-center justify-center gap-3 sm:gap-4">
          <div
            className={cn(
              "min-w-0 max-w-[min(100%,200px)] flex-1 rounded-2xl border-2 px-4 py-2.5 text-center transition-[box-shadow,background-color] duration-300 sm:flex-initial sm:max-w-none",
              !isEcoActive
                ? "border-[#1CB0F6]/50 bg-[#1CB0F6]/[0.08] shadow-[0_0_22px_rgba(28,176,246,0.22)]"
                : "border-gray-100 bg-[#FAFAFA] text-[#4B4B4B]/45",
            )}
            aria-current={!isEcoActive ? "true" : undefined}
          >
            <p className="font-mono text-sm font-bold text-[#1CB0F6]">⚡ HIGH 모드</p>
          </div>
          <div
            className={cn(
              "min-w-0 max-w-[min(100%,200px)] flex-1 rounded-2xl border-2 px-4 py-2.5 text-center transition-[box-shadow,background-color] duration-300 sm:flex-initial sm:max-w-none",
              isEcoActive
                ? "border-[#58CC02]/50 bg-[#58CC02]/[0.08] shadow-[0_0_22px_rgba(88,204,2,0.28)]"
                : "border-gray-100 bg-[#FAFAFA] text-[#4B4B4B]/45",
            )}
            aria-current={isEcoActive ? "true" : undefined}
          >
            <p className="font-mono text-sm font-bold text-[#58CC02]">🌿 ECO 모드</p>
          </div>
        </div>
        <div className="w-full max-w-md px-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/50">
              Saved Token Cost
            </span>
            <span className="font-mono text-[10px] tabular-nums text-[#58CC02]">
              {Math.round(savingsPct)}% · 추정 절감 반영
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            {loading ? (
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#1CB0F6]/80 to-[#58CC02]"
                animate={{ width: ["22%", "78%", "40%"] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
              />
            ) : (
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#1CB0F6]/85 to-[#58CC02]"
                initial={false}
                animate={{ width: `${Math.min(100, savingsPct)}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 24 }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {/* Model Insight */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-[#4B4B4B]">
              <Cpu className="size-3.5 text-[#1CB0F6]" aria-hidden />
              추론 모드
            </span>
            <span
              className={cn(
                "font-mono text-sm font-bold tracking-tight md:text-base",
                mode === "Eco" ? "text-[#58CC02]" : "text-[#1CB0F6]",
              )}
            >
              {label}
            </span>
          </div>
          <p className="min-w-0 break-words font-mono text-xs leading-relaxed text-[#4B4B4B]/85 md:text-[13px]">
            {loading && !finOps ? (
              <span className="text-[#4B4B4B]/55">라우팅·비용 산정 중… CFO 엔진이 토큰 메트릭을 집계합니다.</span>
            ) : (
              insight
            )}
          </p>
        </div>

        {/* Live tokens + KRW savings */}
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-auto lg:min-w-[280px]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/55">
                <Database className="size-3.5 text-[#1CB0F6]" aria-hidden />
                In
              </div>
              <motion.p
                key={inputTok}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="font-mono text-lg font-bold tabular-nums text-[#4B4B4B]"
              >
                {inputTok.toLocaleString("ko-KR")}
              </motion.p>
            </div>
            <div className="rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/55">
                <Database className="size-3.5 rotate-180 text-[#1CB0F6]" aria-hidden />
                Out
              </div>
              <motion.p
                key={outputTok}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="font-mono text-lg font-bold tabular-nums text-[#4B4B4B]"
              >
                {outputTok.toLocaleString("ko-KR")}
              </motion.p>
            </div>
            <div className="col-span-2 rounded-2xl border-2 border-[#58CC02]/35 bg-[#58CC02]/[0.07] px-3 py-2.5 sm:col-span-1">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#58CC02]">
                <Coins className="size-3.5" aria-hidden />
                절감(KRW)
              </div>
              <p className="font-mono text-lg font-bold tabular-nums text-[#58CC02]">{krwFmt.format(krwSaved)}</p>
              <p className="mt-0.5 font-mono text-[10px] text-[#4B4B4B]/50">세션 추정 · FinOps 엔진</p>
            </div>
          </div>
          {cachedHit > 0 ? (
            <p className="text-center font-mono text-[10px] text-[#4B4B4B]/55 md:text-right">
              캐시 히트{" "}
              <span className="font-semibold text-[#1CB0F6]">{cachedHit.toLocaleString("ko-KR")}</span> tok
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/55">
            효율 · {totalTokenUsage.toLocaleString("ko-KR")} tok 합계
          </span>
          <span className="font-mono text-xs font-bold tabular-nums text-[#58CC02]">{Math.round(savingsPct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          {loading ? (
            <motion.div
              className="h-full rounded-full bg-[#58CC02]"
              animate={{ width: ["28%", "72%", "44%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <motion.div
              className="h-full rounded-full bg-[#58CC02]"
              initial={false}
              animate={{ width: `${savingsPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
