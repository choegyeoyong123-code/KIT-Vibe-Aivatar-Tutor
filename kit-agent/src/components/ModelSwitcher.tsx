"use client";

import { LayoutGroup, motion } from "framer-motion";
import type { InferenceCostMode } from "@/constants/vendor-models";
import { cn } from "@/lib/utils";

export type { InferenceCostMode };

export interface EcoHighModelSwitcherProps {
  value: InferenceCostMode;
  onChange: (value: InferenceCostMode) => void;
  className?: string;
  disabled?: boolean;
  /** 헤더: 라벨·힌트 없이 세그먼트만 */
  variant?: "default" | "header";
}

/**
 * 추론 비용 모드 — UI에는 벤더·모델명 없음. 헤더 variant는 🌿 ECO / ⚡ HIGH 만 표시.
 */
export function EcoHighModelSwitcher({
  value,
  onChange,
  className,
  disabled,
  variant = "default",
}: EcoHighModelSwitcherProps) {
  const isHeader = variant === "header";

  return (
    <div className={cn("w-full", className)}>
      {!isHeader ? (
        <p className="mb-2 text-[11px] font-medium tracking-wide text-[#4B4B4B]/60">
          추론 비용 모드
        </p>
      ) : null}
      <LayoutGroup id={isHeader ? "eco-high-header" : "eco-high-switcher"}>
        <div
          role="tablist"
          aria-label="추론 비용 모드"
          className={cn(
            "flex gap-1 rounded-2xl p-1",
            isHeader
              ? "border-2 border-gray-100 bg-white shadow-[0_2px_0_0_rgb(229_231_235),0_1px_2px_0_rgb(0_0_0/0.04)]"
              : "bg-gray-100",
          )}
        >
          <button
            type="button"
            role="tab"
            aria-selected={value === "eco"}
            disabled={disabled}
            onClick={() => onChange("eco")}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center rounded-xl font-semibold transition-colors",
              isHeader ? "min-h-[44px] px-2 py-2 text-sm" : "min-h-[48px] px-2 py-2.5 text-sm",
              isHeader && "active:translate-y-px",
              disabled && "pointer-events-none opacity-50",
              value === "eco"
                ? "text-emerald-500"
                : "text-[#4B4B4B]/50 hover:text-[#4B4B4B]/75",
            )}
          >
            {value === "eco" ? (
              <motion.div
                layoutId={isHeader ? "eco-high-header-pill" : "eco-high-switcher-pill"}
                className={cn(
                  "absolute inset-0 rounded-xl border-2 border-emerald-500 border-b-4 border-b-emerald-700 bg-white",
                  isHeader && "shadow-[inset_0_-3px_0_0_rgb(5_150_105/0.12)]",
                )}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1 whitespace-nowrap">
              <span aria-hidden>🌿</span>
              <span>ECO</span>
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={value === "high"}
            disabled={disabled}
            onClick={() => onChange("high")}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center rounded-xl font-semibold transition-colors",
              isHeader ? "min-h-[44px] px-2 py-2 text-sm" : "min-h-[48px] px-2 py-2.5 text-sm",
              isHeader && "active:translate-y-px",
              disabled && "pointer-events-none opacity-50",
              value === "high"
                ? "text-cyan-500"
                : "text-[#4B4B4B]/50 hover:text-[#4B4B4B]/75",
            )}
          >
            {value === "high" ? (
              <motion.div
                layoutId={isHeader ? "eco-high-header-pill" : "eco-high-switcher-pill"}
                className={cn(
                  "absolute inset-0 rounded-xl border-2 border-cyan-500 border-b-4 border-b-cyan-700 bg-white",
                  isHeader && "shadow-[inset_0_-3px_0_0_rgb(6_182_212/0.15)]",
                )}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1 whitespace-nowrap">
              <span aria-hidden>⚡</span>
              <span>HIGH</span>
            </span>
          </button>
        </div>
      </LayoutGroup>
      {!isHeader ? (
        <p className="mt-2 text-[11px] leading-relaxed text-[#4B4B4B]/60">
          {value === "eco"
            ? "일상 루틴에 맞춘 저비용 추론 경로입니다."
            : "복잡한 분석·다단계 검증에 맞는 고밀도 추론 경로입니다."}
        </p>
      ) : null}
    </div>
  );
}
