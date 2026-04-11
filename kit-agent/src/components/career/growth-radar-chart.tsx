"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, BarChart3, Briefcase } from "lucide-react";
import { memo, useId, useMemo } from "react";
import {
  RADAR_AXIS_ORDER,
  RADAR_LABELS_KO,
  type RadarAxisKey,
  type RadarScores,
} from "@/lib/employability-radar";
import { cn } from "@/lib/utils";

const CX = 120;
const CY = 118;
const R_MAX = 78;
const LEVELS = [0.25, 0.5, 0.75, 1];

function pointFor(axisIndex: number, t: number): [number, number] {
  const a = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / 5;
  return [CX + R_MAX * t * Math.cos(a), CY + R_MAX * t * Math.sin(a)];
}

function pathFromScores(scores: RadarScores): string {
  const pts = RADAR_AXIS_ORDER.map((key, i) => {
    const t = Math.max(0.08, Math.min(1, scores[key] / 100));
    return pointFor(i, t);
  });
  return `M ${pts.map((p) => p.join(",")).join(" L ")} Z`;
}

type GrowthRadarChartProps = {
  scores: RadarScores;
  className?: string;
  bump?: { axis: RadarAxisKey; delta: number } | null;
  /** 우측 패널용 타이틀 */
  meterTitle?: string;
};

// OPTIMIZE: scores/bump가 동일할 때(참조·값) 상위 대시보드 리렌더로 인한 SVG 재계산 감소
export const GrowthRadarChart = memo(function GrowthRadarChart({
  scores,
  className,
  bump,
  meterTitle = "Verified Learning Growth Meter",
}: GrowthRadarChartProps) {
  const gid = useId();
  const pathD = useMemo(() => pathFromScores(scores), [scores]);

  const gridPaths = useMemo(
    () =>
      LEVELS.map((lv) => {
        const pts = Array.from({ length: 5 }, (_, i) => pointFor(i, lv));
        return `M ${pts.map((p) => p.join(",")).join(" L ")} Z`;
      }),
    [],
  );

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(rgba(28,176,246,0.07) 1px, transparent 1px), radial-gradient(rgba(88,204,2,0.06) 1px, transparent 1px)",
          backgroundSize: "18px 18px, 22px 22px",
          backgroundPosition: "0 0, 9px 11px",
        }}
      />

      <div className="relative flex items-start justify-between gap-2 border-b-2 border-gray-100 pb-3">
        <div>
          <p className="flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1CB0F6]">
            <Briefcase className="size-3.5" aria-hidden />
            Employability
          </p>
          <p className="mt-0.5 font-sans text-sm font-bold text-[#4B4B4B]">{meterTitle}</p>
          <p className="mt-0.5 font-sans text-[11px] text-[#4B4B4B]/65">Growth · Proof · 역량 시각화</p>
        </div>
        <div className="flex gap-1.5 text-[#58CC02]" aria-hidden>
          <BarChart3 className="size-5" strokeWidth={2} />
          <Award className="size-5" strokeWidth={2} />
        </div>
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-[280px]">
        <AnimatePresence>
          {bump ? (
            <motion.div
              key={`${bump.axis}-${bump.delta}`}
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: -4, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 360, damping: 26 }}
              className="absolute -top-1 right-0 z-10 rounded-xl border-2 border-[#58CC02]/40 bg-white px-2.5 py-1 font-sans text-xs font-bold text-[#58CC02] shadow-md"
            >
              {RADAR_LABELS_KO[bump.axis]} +{bump.delta}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <svg viewBox="0 0 240 236" className="h-auto w-full" role="img" aria-label="5각 역량 레이더 차트">
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1CB0F6" stopOpacity={0.18} />
              <stop offset="55%" stopColor="#58CC02" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#1CB0F6" stopOpacity={0.14} />
            </linearGradient>
            <linearGradient id={`${gid}-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1CB0F6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#58CC02" stopOpacity={0.9} />
            </linearGradient>
          </defs>

          {gridPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#E8EAED"
              strokeWidth={i === gridPaths.length - 1 ? 1.25 : 1}
            />
          ))}

          {RADAR_AXIS_ORDER.map((_, i) => {
            const [x1, y1] = pointFor(i, 0);
            const [x2, y2] = pointFor(i, 1);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#E8EAED"
                strokeWidth={1}
              />
            );
          })}

          <motion.path
            d={pathD}
            fill={`url(#${gid}-fill)`}
            stroke={`url(#${gid}-stroke)`}
            strokeWidth={2.25}
            strokeLinejoin="round"
            initial={false}
            animate={{ d: pathD }}
            transition={{ type: "spring", stiffness: 118, damping: 22, mass: 0.85 }}
          />

          {RADAR_AXIS_ORDER.map((key, i) => {
            const [lx, ly] = pointFor(i, 1.14);
            return (
              <text
                key={key}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#4B4B4B] font-sans text-[9px] font-semibold"
                style={{ fontSize: "9px" }}
              >
                {RADAR_LABELS_KO[key]}
              </text>
            );
          })}
        </svg>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-gray-100 pt-3 font-sans text-[10px] text-[#4B4B4B]/85">
        {RADAR_AXIS_ORDER.map((key) => (
          <li
            key={key}
            className="flex min-w-0 items-center justify-between gap-1 tabular-nums"
          >
            <span className="min-w-0 truncate">{RADAR_LABELS_KO[key]}</span>
            <span className="shrink-0 font-bold text-[#1CB0F6] transition-colors duration-300">
              {scores[key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});
