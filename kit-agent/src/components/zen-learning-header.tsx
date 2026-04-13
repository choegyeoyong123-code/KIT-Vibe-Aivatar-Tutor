"use client";

import { useId, useState } from "react";
import {
  BarChart3,
  Clapperboard,
  FileText,
  ImageIcon,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { EcoHighModelSwitcher, type InferenceCostMode } from "@/components/ModelSwitcher";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  UserSettings,
  type TutoringTonePreference,
} from "@/components/user-settings";
import { SecurityTrustDialog } from "@/components/security-trust-dialog";

const contestYear = () => new Date().getFullYear();

/** CFO·비동기 폴링 맥락 — Info 툴팁으로만 노출 */
const CFO_ASYNC_OPTIMIZATION_CAPTION =
  "최적화 모드 작동 중: 필요한 만큼만 똑똑하게 자원을 나눠 써서 더 빠르고 정확한 결과를 준비하고 있습니다.";

export interface ZenLearningHeaderProps {
  inferenceMode: InferenceCostMode;
  onInferenceModeChange: (v: InferenceCostMode) => void;
  disabled?: boolean;
  /** 0–100 학습 진행 */
  todayProgressPct: number;
  /** 역량 5축 평균 (동기: userMastery) */
  employabilityAvg: number;
  /** FinOps 절감률 % (동기: savingsRate) */
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
  className?: string;
  /** 프로필(나) 패널 — 표시 이름 */
  userDisplayName?: string;
  /** 프로필 패널 — 이메일(데모·연동 계정 문구 등) */
  userEmail?: string;
  /** 프로필 패널 — 학습 목표 한 줄·여러 줄 */
  learningGoalSummary?: string;
  /** 튜터링 톤 선호 */
  tutoringTone?: TutoringTonePreference;
  onTutoringToneChange?: (v: TutoringTonePreference) => void;
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
  className,
  userDisplayName = "학습자",
  userEmail = "",
  learningGoalSummary = "",
  tutoringTone = "balanced",
  onTutoringToneChange,
}: ZenLearningHeaderProps) {
  const cfoTipId = useId();
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [securityTrustOpen, setSecurityTrustOpen] = useState(false);
  const savingsRate = Math.max(
    0,
    Math.min(100, Number.isFinite(savingsPct) ? savingsPct : 0),
  );
  const userMastery = Math.max(
    0,
    Number.isFinite(employabilityAvg) ? employabilityAvg : 0,
  );
  const progressSafe = Math.max(0, Math.min(100, Number.isFinite(todayProgressPct) ? todayProgressPct : 0));

  return (
    <>
    <header
      className={cn(
        "sticky top-0 z-50 w-full shrink-0 border-b-2 border-gray-100 bg-[#FFFFFF]/95 backdrop-blur-md kit-mobile-reduce-blur",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[1400px] px-3 py-3 sm:px-4 lg:px-5",
          "flex flex-col gap-2.5",
          "lg:grid lg:grid-cols-[minmax(0,auto)_minmax(280px,1fr)_minmax(0,auto)] lg:items-center lg:gap-x-8 lg:gap-y-0",
        )}
      >
        {/* 좌: 브랜드 · 랩/스튜디오 */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 lg:shrink-0 lg:flex-nowrap">
          <div className="shrink-0">
            <p className="font-sans text-[8px] font-semibold uppercase tracking-[0.2em] text-[#4B4B4B]/45 sm:text-[9px]">
              KIT Vibe-Coding
            </p>
            <p className="font-sans text-base font-semibold leading-tight tracking-tight text-[#4B4B4B] sm:text-lg">
              {contestYear()}
            </p>
          </div>
          {onOpenVisualLab && onOpenMediaStudio ? (
            <div className="flex min-w-0 shrink-0 items-center gap-1.5 overflow-x-auto sm:gap-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

        {/* 중: ECO / HIGH — 최소 폭 확보로 클리핑 방지 */}
        <div className="flex w-full min-w-0 shrink-0 justify-center lg:min-w-[280px] lg:justify-center">
          <EcoHighModelSwitcher
            variant="header"
            value={inferenceMode}
            onChange={onInferenceModeChange}
            disabled={disabled}
            className="w-full shrink-0 lg:w-[300px]"
          />
        </div>

        {/* 우: 비용 · 상태 · 역량 · 절감(+Info) · 보안 · 액션 */}
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-start gap-2 sm:gap-2.5 lg:justify-end lg:gap-3">
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
            title="오늘의 학습 · 역량 평균 (userMastery)"
          >
            <button
              type="button"
              onClick={() => setUserSettingsOpen(true)}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-gray-100 bg-[#FAFAFA] font-sans text-[10px] font-bold text-[#4B4B4B] outline-none transition-colors hover:border-gray-200 hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:ring-offset-2"
              aria-haspopup="dialog"
              aria-expanded={userSettingsOpen}
              aria-label="내 프로필 및 개인 설정"
            >
              나
            </button>
            <div className="min-w-[72px] max-w-[88px] shrink-0">
              <p className="font-sans text-[9px] font-medium text-[#4B4B4B]/50">학습</p>
              <Progress value={progressSafe} className="mt-0.5 h-1 bg-gray-100 [&>div]:bg-emerald-500" />
              <p className="mt-0.5 font-sans text-[9px] tabular-nums text-[#4B4B4B]/70">
                역량 {Math.round(userMastery)}
              </p>
            </div>
          </div>

          <div className="group/cfo-tip relative inline-flex shrink-0 items-center gap-0.5">
            <span
              className="inline-flex items-center rounded-full border-2 border-emerald-100 bg-emerald-50/80 px-2 py-0.5 font-sans text-[10px] font-semibold tabular-nums text-emerald-700 sm:text-[11px]"
              title="추정 절감 효율 (savingsRate)"
            >
              절약 {Math.round(savingsRate)}%
            </span>
            <button
              type="button"
              tabIndex={0}
              className="shrink-0 rounded-full p-0.5 text-[#4B4B4B]/45 outline-none transition-colors hover:text-[#4B4B4B]/75 focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:ring-offset-2"
              aria-label="최적화 모드·CFO 안내"
              aria-describedby={cfoTipId}
            >
              <Info className="size-3.5" strokeWidth={2} aria-hidden />
            </button>
            <div
              id={cfoTipId}
              role="tooltip"
              className={cn(
                "pointer-events-none invisible absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(18rem,calc(100vw-2rem))] origin-top-right scale-95 rounded-2xl border-2 border-gray-100 bg-white px-3 py-2.5 text-left text-[11px] font-normal leading-snug text-[#4B4B4B]/80 opacity-0 shadow-[0_4px_0_0_rgb(229_231_235)] transition-all duration-150",
                "group-hover/cfo-tip:visible group-hover/cfo-tip:scale-100 group-hover/cfo-tip:opacity-100",
                "group-focus-within/cfo-tip:visible group-focus-within/cfo-tip:scale-100 group-focus-within/cfo-tip:opacity-100",
              )}
            >
              {CFO_ASYNC_OPTIMIZATION_CAPTION}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSecurityTrustOpen(true)}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-gray-100 bg-white shadow-[0_2px_0_0_rgb(229_231_235)] outline-none transition-colors hover:border-gray-200 hover:bg-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:ring-offset-2"
            title={securityOk ? "보안 상태 양호 — 법적 권리·데이터 제어 안내" : "보안 모니터링 중 — 법적 권리·데이터 제어 안내"}
            aria-haspopup="dialog"
            aria-expanded={securityTrustOpen}
            aria-label="개인정보 보호법상 권리 및 보안·신뢰 안내"
          >
            <ShieldCheck
              className={cn("size-4", securityOk ? "text-emerald-500" : "text-[#4B4B4B]/35")}
              strokeWidth={2}
              aria-hidden
            />
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenReport}
            className="h-8 shrink-0 gap-1 rounded-2xl border-2 border-gray-100 bg-white px-2.5 text-[11px] font-medium text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)] hover:bg-[#FAFAFA] sm:h-9 sm:px-3"
          >
            <BarChart3 className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden xs:inline">보고서</span>
          </Button>

          <button
            type="button"
            onClick={onOpenSessionReceipt}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "size-8 shrink-0 rounded-full border-2 border-transparent text-[#4B4B4B]/55 hover:border-gray-100 hover:bg-[#FAFAFA] hover:text-[#4B4B4B]",
            )}
            aria-label="세션 영수증"
          >
            <FileText className="size-4" />
          </button>
        </div>
      </div>
    </header>
    <UserSettings
      open={userSettingsOpen}
      onOpenChange={setUserSettingsOpen}
      displayName={userDisplayName}
      email={userEmail}
      learningGoal={learningGoalSummary}
      tutoringTone={tutoringTone}
      onTutoringToneChange={onTutoringToneChange}
    />
    <SecurityTrustDialog open={securityTrustOpen} onOpenChange={setSecurityTrustOpen} />
    </>
  );
}
