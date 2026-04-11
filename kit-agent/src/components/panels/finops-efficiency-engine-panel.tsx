"use client";

import { useEffect, useId, useState } from "react";
import { animate } from "framer-motion";
import { Gauge } from "lucide-react";
import { glassPanelClass, kitSurfaceBorder } from "@/lib/glass-styles";
import { cn } from "@/lib/utils";

const ICON = { strokeWidth: 1.75 } as const;

export type FinOpsEfficiencyEnginePanelProps = {
  measuredSavingsPct?: number;
  totalSavingsUsd?: number;
  tokensSaved?: number;
  className?: string;
};

function useAnimatedUsd(target: number) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const c = animate(0, target, {
      type: "spring",
      stiffness: 64,
      damping: 22,
      mass: 0.9,
      onUpdate: (v) =>
        setDisplay(typeof v === "number" ? Math.round(v * 100) / 100 : 0),
    });
    return () => c.stop();
  }, [target]);

  return display;
}

/** 토큰 효율성 — 아이콘 + 에메랄드 볼드 수치만 */
export function FinOpsEfficiencyEnginePanel({
  measuredSavingsPct = 82,
  totalSavingsUsd = 1245.67,
  tokensSaved = 0,
  className,
}: FinOpsEfficiencyEnginePanelProps) {
  const labelId = useId();
  const barPct = Math.min(100, Math.max(0, Math.round(measuredSavingsPct)));
  const dollars = useAnimatedUsd(totalSavingsUsd);

  return (
    <div
      className={cn(glassPanelClass({ hover: true, rounded: "2xl" }), "p-5", className)}
      aria-labelledby={labelId}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-gray-100 bg-white"
          aria-hidden
        >
          <Gauge {...ICON} className="size-6 text-[#58CC02]" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            id={labelId}
            className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4B4B4B]/55"
          >
            토큰 효율성
          </p>
          <p className="mt-1 font-sans text-3xl font-bold tabular-nums tracking-tight text-[#58CC02]">
            {barPct}%
          </p>
          <p className="mt-0.5 font-sans text-xs text-[#4B4B4B]/65">측정 절감률</p>
          <p className="mt-2 font-sans text-[10px] tabular-nums text-[#4B4B4B]/45">
            추정 절약 토큰 {tokensSaved.toLocaleString("ko-KR")}
          </p>
        </div>
      </div>

      <div className={cn("mt-5 border-t pt-5", kitSurfaceBorder)}>
        <p className="font-sans text-[10px] font-medium uppercase tracking-wider text-[#4B4B4B]/50">
          추정 절감 (USD)
        </p>
        <p className="mt-1 font-sans text-xl font-bold tabular-nums text-[#58CC02]">
          ${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}
