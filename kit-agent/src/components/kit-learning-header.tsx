"use client";

import { Button } from "@/components/ui/button";
import { EcoHighModelSwitcher, type InferenceCostMode } from "@/components/ModelSwitcher";
import { cn } from "@/lib/utils";

export interface KitLearningHeaderProps {
  inferenceMode: InferenceCostMode;
  onInferenceModeChange: (v: InferenceCostMode) => void;
  onSessionReceipt: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 학습 콘솔 상단 — sticky · 글래스 · 브랜딩 + 중앙 ECO/HIGH · 우측 영수증만 (더미 아이콘 없음).
 */
export function KitLearningHeader({
  inferenceMode,
  onInferenceModeChange,
  onSessionReceipt,
  disabled,
  className,
}: KitLearningHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full shrink-0 border-b-2 border-gray-100 bg-white/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:gap-4 md:px-6">
        <div className="min-w-0 shrink-0">
          <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.22em] text-[#4B4B4B]/55">
            KIT Vibe-Coding
          </p>
          <p className="font-sans text-lg font-semibold leading-tight tracking-tight text-[#4B4B4B] md:text-xl">
            2026
          </p>
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-1">
          <EcoHighModelSwitcher
            variant="header"
            value={inferenceMode}
            onChange={onInferenceModeChange}
            disabled={disabled}
            className="w-full max-w-[280px] sm:max-w-[320px]"
          />
        </div>

        <div className="shrink-0">
          <Button
            type="button"
            variant="receiptOutline"
            size="sm"
            className="h-9 rounded-2xl px-3 text-xs md:h-10 md:px-4 md:text-sm"
            onClick={onSessionReceipt}
          >
            세션 영수증
          </Button>
        </div>
      </div>
    </header>
  );
}
