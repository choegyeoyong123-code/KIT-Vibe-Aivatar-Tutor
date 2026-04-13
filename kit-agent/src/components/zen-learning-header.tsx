"use client";

import {
  BarChart3,
  Clapperboard,
  FileText,
  ImageIcon,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { EcoHighModelSwitcher, type InferenceCostMode } from "@/components/ModelSwitcher";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ZenLearningHeaderProps {
  inferenceMode: InferenceCostMode;
  onInferenceModeChange: (v: InferenceCostMode) => void;
  disabled?: boolean;
  /** 0–100 학습 진행 */
  todayProgressPct: number;
  /** 역량 5축 평균 (간단 표기) */
  employabilityAvg: number;
  /** FinOps 절감률 등 */
  savingsPct: number;
  /** 보안 스냅샷: 안전 여부 */
  securityOk: boolean;
  onOpenReport: () => void;
  onOpenSessionReceipt: () => void;
  /** 멀티모달 스튜디오 — Visual Lab 모달 */
  onOpenVisualLab?: () => void;
  /** 멀티모달 스튜디오 — Media Studio 모달 */
  onOpenMediaStudio?: () => void;
  /** 헤더 Visual Lab 멀티 에이전트 시뮬레이션 중 */
  studioVisualRunning?: boolean;
  studioMediaRunning?: boolean;
  /** 분석 상태 한 줄 (심사용 HUD) */
  studioStatusLabel?: string | null;
  /** 세션 누적 추정 비용 (데모 HUD) */
  sessionCostUsd?: number;
  className?: string;
}

/**
 * Zen 상단 — 로고 + ECO/HIGH + 우측 미니 상태(진행·역량·절감·안전·보고서).
 */
export function ZenLearningHeader({
  inferenceMode,
  onInferenceModeChange,
  disabled,
  todayProgressPct,
  employabilityAvg,
  savingsPct,
  securityOk,
  onOpenReport,
  onOpenSessionReceipt,
  onOpenVisualLab,
  onOpenMediaStudio,
  studioVisualRunning,
  studioMediaRunning,
  studioStatusLabel,
  sessionCostUsd,
  className,
}: ZenLearningHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full shrink-0 border-b-2 border-gray-100 bg-[#FFFFFF]/95 backdrop-blur-md kit-mobile-reduce-blur",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-2 px-3 py-3 sm:gap-4 sm:px-5">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <div>
            <p className="font-sans text-[8px] font-semibold uppercase tracking-[0.2em] text-[#4B4B4B]/45 sm:text-[9px]">
              KIT Vibe-Coding
            </p>
            <p className="font-sans text-base font-semibold leading-tight tracking-tight text-[#4B4B4B] sm:text-lg">
              2026
            </p>
          </div>
          {onOpenVisualLab && onOpenMediaStudio ? (
            <div className="flex max-w-[min(100vw-8rem,200px)] items-center gap-1.5 overflow-x-auto sm:max-w-none">
              <motion.button
                type="button"
                whileTap={{ y: 2, scale: 0.98 }}
                onClick={onOpenVisualLab}
                disabled={studioVisualRunning || studioMediaRunning}
                data-golden-target="zen-visual-lab"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "tactile-button h-8 shrink-0 gap-1 rounded-2xl border-2 border-gray-100 bg-white px-2 font-sans text-[10px] font-medium text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)] hover:bg-[#FAFAFA] sm:h-9 sm:px-2.5 sm:text-[11px]",
                )}
              >
                {studioVisualRunning ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-emerald-600" aria-hidden />
                ) : (
                  <ImageIcon className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
                )}
                <span className={cn(studioVisualRunning && "sr-only")}>Visual Lab</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ y: 2, scale: 0.98 }}
                onClick={onOpenMediaStudio}
                disabled={studioVisualRunning || studioMediaRunning}
                data-golden-target="zen-media-studio"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "tactile-button h-8 shrink-0 gap-1 rounded-2xl border-2 border-gray-100 bg-white px-2 font-sans text-[10px] font-medium text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)] hover:bg-[#FAFAFA] sm:h-9 sm:px-2.5 sm:text-[11px]",
                )}
              >
                {studioMediaRunning ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-cyan-600" aria-hidden />
                ) : (
                  <Clapperboard className="size-3.5 shrink-0 text-cyan-600" aria-hidden />
                )}
                <span className={cn(studioMediaRunning && "sr-only")}>Media Studio</span>
              </motion.button>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 justify-center overflow-x-auto overflow-y-visible px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <EcoHighModelSwitcher
            variant="header"
            value={inferenceMode}
            onChange={onInferenceModeChange}
            disabled={disabled}
            className="w-full min-w-[240px] max-w-[260px] shrink-0 sm:max-w-[300px]"
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {typeof sessionCostUsd === "number" ? (
            <span
              className="hidden rounded-full border-2 border-cyan-100 bg-cyan-50/90 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-cyan-800 sm:inline"
              title="세션 누적 추정 비용 (데모)"
            >
              ${sessionCostUsd.toFixed(4)} 세션
            </span>
          ) : null}
          {studioStatusLabel ? (
            <span
              className="max-w-[140px] truncate rounded-lg border border-emerald-200 bg-emerald-50/90 px-2 py-0.5 text-[9px] font-medium text-emerald-900 sm:max-w-[220px] sm:text-[10px]"
              title={studioStatusLabel}
            >
              {studioStatusLabel}
            </span>
          ) : null}
          <div
            className="hidden items-center gap-2 rounded-2xl border-2 border-gray-100 bg-white px-2 py-1.5 shadow-[0_2px_0_0_rgb(229_231_235)] sm:flex"
            title="오늘의 학습 · 역량 평균"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border-2 border-gray-100 bg-[#FAFAFA] font-sans text-[10px] font-bold text-[#4B4B4B]">
              나
            </div>
            <div className="min-w-[72px] max-w-[88px]">
              <p className="font-sans text-[9px] font-medium text-[#4B4B4B]/50">학습</p>
              <Progress value={todayProgressPct} className="mt-0.5 h-1 bg-gray-100 [&>div]:bg-emerald-500" />
              <p className="mt-0.5 font-sans text-[9px] tabular-nums text-[#4B4B4B]/70">
                역량 {Math.round(employabilityAvg)}
              </p>
            </div>
          </div>

          <span
            className="inline-flex items-center rounded-full border-2 border-emerald-100 bg-emerald-50/80 px-2 py-0.5 font-sans text-[10px] font-semibold tabular-nums text-emerald-700 sm:text-[11px]"
            title="추정 절감 효율"
          >
            절약 {Math.round(savingsPct)}%
          </span>

          <span
            className="inline-flex size-8 items-center justify-center rounded-full border-2 border-gray-100 bg-white shadow-[0_2px_0_0_rgb(229_231_235)]"
            title={securityOk ? "보안 상태 양호" : "보안 모니터링 중"}
          >
            <ShieldCheck
              className={cn("size-4", securityOk ? "text-emerald-500" : "text-[#4B4B4B]/35")}
              strokeWidth={2}
              aria-hidden
            />
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenReport}
            className="h-8 gap-1 rounded-2xl border-2 border-gray-100 bg-white px-2.5 text-[11px] font-medium text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)] hover:bg-[#FAFAFA] sm:h-9 sm:px-3"
          >
            <BarChart3 className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden xs:inline">보고서</span>
          </Button>

          <button
            type="button"
            onClick={onOpenSessionReceipt}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "size-8 rounded-full border-2 border-transparent text-[#4B4B4B]/55 hover:border-gray-100 hover:bg-[#FAFAFA] hover:text-[#4B4B4B]",
            )}
            aria-label="세션 영수증"
          >
            <FileText className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
