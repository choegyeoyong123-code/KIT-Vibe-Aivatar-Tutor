"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
  BarChart3,
  Coins,
  Gauge,
  Sparkles,
  TrendingDown,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTokenSavings } from "@/components/token-savings-context";
import {
  DEFAULT_DYNAMIC_PERSONA_ID,
  isDynamicPersonaId,
  personaLabelKo,
} from "@/lib/agent/persona/persona-presets";
import type { AgentStateSnapshot } from "@/lib/agent/types";

/** 페르소나 슬롯 기준 전통적(중복 삽입) vs 주입 추정 토큰 */
function tokenBreakdown(m: NonNullable<AgentStateSnapshot["lastPromptInjectionMetrics"]>) {
  const slotTok = Math.max(1, Math.ceil(m.personaInstructionChars / 4));
  const saved = m.estimatedSavedTokens;
  const traditionalPersonaSlice = slotTok + saved;
  return {
    slotTok,
    saved,
    traditionalPersonaSlice,
  };
}

const INPUT_USD_PER_1K = 0.0025;

function useAnimatedInt(target: number, active: boolean) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    mv.set(0);
    const c = animate(mv, target, {
      type: "spring",
      stiffness: 120,
      damping: 20,
    });
    return () => c.stop();
  }, [active, target, mv]);

  useEffect(() => {
    const u = rounded.on("change", (v) => setDisplay(v));
    return () => u();
  }, [rounded]);

  return display;
}

export function TokenSavingsReport({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const titleId = useId();
  const {
    cumulativeSavedTokens,
    cumulativeRunsRecorded,
    personaRows,
    liveSnapshot,
  } = useTokenSavings();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const metrics = liveSnapshot?.lastPromptInjectionMetrics ?? null;
  const rawPid = liveSnapshot?.currentPersonaId;
  const livePersona =
    typeof rawPid === "string" && isDynamicPersonaId(rawPid)
      ? rawPid
      : DEFAULT_DYNAMIC_PERSONA_ID;

  const breakdown = metrics ? tokenBreakdown(metrics) : null;

  const maxBar = useMemo(() => {
    if (!breakdown) return 1;
    return Math.max(breakdown.traditionalPersonaSlice, breakdown.slotTok, 1);
  }, [breakdown]);

  const estSavedUsd = (cumulativeSavedTokens / 1000) * INPUT_USD_PER_1K;
  const displayTotal = useAnimatedInt(cumulativeSavedTokens, open);
  const finOps = liveSnapshot?.finOps ?? null;
  const finOpsBarMax = useMemo(() => {
    if (!finOps) return 1;
    return Math.max(finOps.traditionalTokens, finOps.optimizedTokens, 1);
  }, [finOps]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted) return null;

  const panel = (
    <>
      <motion.div
        role="presentation"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-[2px]",
          !open && "pointer-events-none",
        )}
        style={{ visibility: open ? "visible" : "hidden" }}
        onClick={() => onOpenChange(false)}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ x: "104%" }}
        animate={{ x: open ? 0 : "104%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className={cn(
          "fixed top-0 right-0 z-[101] flex h-[100dvh] w-full max-w-[min(100vw,28rem)] flex-col border-l border-slate-200/80 bg-[#f8fafc] shadow-2xl dark:border-slate-800 dark:bg-slate-950",
          !open && "pointer-events-none",
        )}
        style={{ visibility: open ? "visible" : "hidden" }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/90 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              FinOps · CFO 연동
            </p>
            <h2
              id={titleId}
              className="mt-1 font-bold text-xl tracking-tight text-slate-900 dark:text-slate-50"
            >
              Token Savings Report
            </h2>
            <p className="mt-1 text-pretty text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {"{{PERSONA_INSTRUCTION}}"} 슬롯으로 페르소나 블록 중복 전송을 줄인 효과를 CFO 추정치로
              시각화합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
          >
            <X className="size-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {finOps ? (
            <section className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/90 p-4 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold uppercase tracking-wide dark:text-amber-200/95">
                <Zap className="size-3.5" aria-hidden />
                CFO · Token Efficiency Engine
              </div>
              <p className="mt-3 text-pretty text-sm font-medium leading-relaxed text-amber-950 dark:text-amber-50">
                {finOps.efficiencySummary}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-white/80 px-2.5 py-2 dark:bg-slate-900/60">
                  <dt className="text-slate-500 dark:text-slate-400">Hypothetical full input</dt>
                  <dd className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                    {finOps.traditionalTokens.toLocaleString("ko-KR")} tok
                  </dd>
                </div>
                <div className="rounded-lg bg-white/80 px-2.5 py-2 dark:bg-slate-900/60">
                  <dt className="text-slate-500 dark:text-slate-400">Optimized (injection + cache)</dt>
                  <dd className="font-mono font-semibold text-emerald-800 tabular-nums dark:text-emerald-300">
                    {finOps.optimizedTokens.toLocaleString("ko-KR")} tok
                  </dd>
                </div>
                <div className="rounded-lg bg-white/80 px-2.5 py-2 dark:bg-slate-900/60">
                  <dt className="text-slate-500 dark:text-slate-400">Savings (input)</dt>
                  <dd className="font-mono font-semibold text-amber-900 tabular-nums dark:text-amber-100">
                    {finOps.savingsPercentage}%
                  </dd>
                </div>
                <div className="rounded-lg bg-white/80 px-2.5 py-2 dark:bg-slate-900/60">
                  <dt className="text-slate-500 dark:text-slate-400">Input $ saved (est.)</dt>
                  <dd className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                    ${finOps.dollarsSaved.toFixed(4)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2">
                <BarRow
                  label="Hypothetical full-prompt input"
                  sub="중복 페르소나·콜드 풀 시나리오"
                  value={finOps.traditionalTokens}
                  max={finOpsBarMax}
                  tone="rose"
                />
                <BarRow
                  label="Optimized input (measured + cache model)"
                  sub="Variable Injection + base KIT prompt cache"
                  value={finOps.optimizedTokens}
                  max={finOpsBarMax}
                  tone="emerald"
                />
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
              <Coins className="size-3.5" aria-hidden />
              Cumulative savings
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <span className="font-mono font-bold text-4xl tabular-nums text-emerald-600 dark:text-emerald-400">
                {displayTotal.toLocaleString("ko-KR")}
              </span>
              <span className="pb-1.5 text-sm font-medium text-slate-500">tokens (est.)</span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              누적 실행 {cumulativeRunsRecorded}회 반영 · 입력 프롬프트 기준 절감 추정
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 text-sm dark:bg-emerald-950/40">
              <span className="flex items-center gap-1.5 font-medium text-emerald-900 dark:text-emerald-100">
                <TrendingDown className="size-4" aria-hidden />
                대략 절감(입력 $/1K 기준)
              </span>
              <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                ~${estSavedUsd.toFixed(4)} USD
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
              <BarChart3 className="size-3.5" aria-hidden />
              Prompt strategy comparison
            </div>
            {!breakdown ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                학습 파이프라인을 한 번 실행하면 Knowledge Distiller의{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs dark:bg-slate-800">
                  lastPromptInjectionMetrics
                </code>{" "}
                가 표시됩니다.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                <p className="text-xs text-slate-500">
                  최근 스냅샷 · 페르소나{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {personaLabelKo(livePersona)}
                  </strong>
                </p>
                <div className="space-y-3">
                  <BarRow
                    label="Traditional full-prompting (페르소나 슬라이스)"
                    sub="중복 삽입까지 포함한 추정"
                    value={breakdown.traditionalPersonaSlice}
                    max={maxBar}
                    tone="rose"
                  />
                  <BarRow
                    label="Variable injection (단일 슬롯)"
                    sub="{{PERSONA_INSTRUCTION}} 1회"
                    value={breakdown.slotTok}
                    max={maxBar}
                    tone="emerald"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-emerald-300/70 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
                  <Sparkles className="size-4 shrink-0" aria-hidden />
                  이 실행에서 페르소나 관련 입력 약{" "}
                  <strong>{breakdown.saved.toLocaleString("ko-KR")} tok</strong> 절감 추정
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
              <Gauge className="size-3.5" aria-hidden />
              API efficiency by persona
            </div>
            <ul className="mt-4 space-y-3">
              {personaRows.map((row) => {
                const maxSaved = Math.max(
                  1,
                  ...personaRows.map((r) => r.savedTokens),
                );
                const pct = row.savedTokens > 0 ? (row.savedTokens / maxSaved) * 100 : 0;
                const avgPerRun =
                  row.runs > 0 ? Math.round(row.savedTokens / row.runs) : 0;
                return (
                  <li
                    key={row.personaId}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {row.labelKo}
                      </span>
                      <span className="font-mono text-xs text-slate-600 tabular-nums dark:text-slate-400">
                        {row.savedTokens.toLocaleString("ko-KR")} tok · {row.runs}회
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {row.runs > 0 ? (
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        실행당 평균 절감 추정: {avgPerRun.toLocaleString("ko-KR")} tok
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-slate-400">아직 기록 없음</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </motion.aside>
    </>
  );

  return createPortal(panel, document.body);
}

function BarRow({
  label,
  sub,
  value,
  max,
  tone,
}: {
  label: string;
  sub: string;
  value: number;
  max: number;
  tone: "rose" | "emerald";
}) {
  const w = Math.min(100, (value / max) * 100);
  const bg =
    tone === "rose"
      ? "bg-gradient-to-r from-rose-500 to-orange-400"
      : "bg-gradient-to-r from-emerald-500 to-teal-400";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
          <p className="text-[11px] text-slate-500">{sub}</p>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          {value.toLocaleString("ko-KR")}
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
        <motion.div
          className={cn("h-full rounded-full", bg)}
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
      </div>
    </div>
  );
}
