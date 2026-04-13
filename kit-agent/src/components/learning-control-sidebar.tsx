"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kitSidebarRailClass } from "@/lib/glass-styles";
import { EDUCATIONAL_PERSONAS } from "@/constants/personas";
import { useEducationalPersona } from "@/components/educational-persona-context";
import { useSecurityPulse } from "@/components/security-pulse-context";

const contestYear = () => new Date().getFullYear();

const personaCardBase =
  "flex w-full items-center gap-3 rounded-xl border-2 border-b-4 border-gray-200 bg-white px-3 py-2.5 text-left font-sans transition-transform active:translate-y-1";

export type LearningControlSidebarProps = {
  measuredSavingsPct: number;
  totalSavingsUsd: number;
  tokensSaved: number;
  onOpenFinOpsReport: () => void;
  className?: string;
};

function SidebarSecuritySummary() {
  const { snapshot } = useSecurityPulse();
  const { phase, isPhotoDeleted, deletion_receipt } = snapshot;

  const safe = phase === "success" && isPhotoDeleted;
  const active = phase === "active";

  const title = safe ? "보안 상태 · 안전" : active ? "보안 · 처리 중" : "보안 · 대기";
  const subtitle = safe
    ? "세션 무결성 확인됨"
    : active
      ? "미디어·버퍼 암호화 경로 활성"
      : "파이프라인 실행 시 상태가 갱신됩니다.";
  const receiptHint =
    deletion_receipt?.unique_audit_signature != null
      ? `감사 서명 ${deletion_receipt.unique_audit_signature.slice(0, 8)}…`
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-b-4 px-3 py-3",
        safe
          ? "border-emerald-200 border-b-emerald-500 bg-emerald-50/50"
          : active
            ? "border-cyan-200 border-b-cyan-500 bg-cyan-50/40"
            : "border-gray-200 border-b-gray-300 bg-white",
      )}
      role="status"
      aria-live="polite"
    >
      <p
        className={cn(
          "flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em]",
          safe ? "text-emerald-700/80" : active ? "text-cyan-800/80" : "text-[#4B4B4B]/50",
        )}
      >
        Security Pulse
        {active ? (
          <span
            className="kit-breathe inline-block size-1.5 rounded-full bg-cyan-500"
            aria-hidden
          />
        ) : null}
      </p>
      <p
        className={cn(
          "mt-1 font-sans text-sm font-bold",
          safe ? "text-emerald-600" : active ? "text-cyan-600" : "text-[#4B4B4B]",
        )}
      >
        {title}
      </p>
      <p className="mt-1 font-sans text-[11px] leading-snug text-[#4B4B4B]/70">{subtitle}</p>
      {receiptHint ? (
        <p className="mt-2 font-mono text-[10px] text-[#4B4B4B]/55">{receiptHint}</p>
      ) : null}
    </div>
  );
}

function SidebarFinOpsGamified({
  measuredSavingsPct,
  totalSavingsUsd,
  tokensSaved,
}: Pick<LearningControlSidebarProps, "measuredSavingsPct" | "totalSavingsUsd" | "tokensSaved">) {
  const bar = Math.min(100, Math.max(0, Math.round(measuredSavingsPct)));

  return (
    <div className="rounded-xl border-2 border-b-4 border-amber-200 border-b-amber-400 bg-gradient-to-b from-amber-50/90 to-white px-3 py-3">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800/70">
        FinOps · 절감
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-sans text-2xl font-black tabular-nums text-[#58CC02]">
          {bar > 0 ? `${bar}%` : "—"}
        </p>
        <p className="pb-0.5 text-right font-sans text-[10px] font-medium text-[#4B4B4B]/60">
          추정 절약
          <br />
          <span className="font-mono text-xs text-[#4B4B4B]">
            {totalSavingsUsd > 0 ? `$${totalSavingsUsd.toFixed(2)}` : "—"}
          </span>
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full border border-amber-200/80 bg-amber-100/80"
        role="progressbar"
        aria-valuenow={bar}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="토큰 절감 효율"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#58CC02] to-emerald-400 transition-[width] duration-500"
          style={{ width: `${bar}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] tabular-nums text-[#4B4B4B]/65">
        누적 절약 토큰 {tokensSaved.toLocaleString("ko-KR")} · Lv.
        {measuredSavingsPct > 0 || tokensSaved > 0
          ? Math.min(99, 1 + Math.floor(bar / 12))
          : "—"}
      </p>
    </div>
  );
}

/**
 * 데스크톱 좌측 고정 제어 패널 — 튜터(교육 페르소나), 보안·FinOps 요약, 내부 스크롤.
 */
export function LearningControlSidebar({
  measuredSavingsPct,
  totalSavingsUsd,
  tokensSaved,
  onOpenFinOpsReport,
  className,
}: LearningControlSidebarProps) {
  const { selectedPersona, selectPersona } = useEducationalPersona();

  return (
    <aside
      className={cn(
        kitSidebarRailClass,
        "hidden min-h-0 w-full max-w-none shrink-0 flex-col gap-4 overflow-y-auto border-b-2 border-gray-100 p-4 sm:p-5 lg:flex",
        "lg:h-[calc(100vh-80px)] lg:max-h-[calc(100vh-80px)] lg:w-80 lg:flex-shrink-0 lg:border-b-0 lg:border-r-2 border-gray-100",
        className,
      )}
    >
      <div className="shrink-0">
        <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.22em] text-[#4B4B4B]/55">
          KIT Vibe-Coding
        </p>
        <p className="mt-0.5 font-sans text-lg font-semibold tracking-tight text-[#4B4B4B]">
          {contestYear()}
        </p>
        <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-[#4B4B4B]/65">
          튜터·보안·비용을 한 패널에서 조절합니다.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href="/visual-lab"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-xl border-2 border-gray-100 bg-white font-sans text-xs text-[#4B4B4B] hover:bg-[#FAFAFA]",
          )}
        >
          Visual Lab
        </Link>
        <Link
          href="/media-studio"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-xl border-2 border-gray-100 bg-white font-sans text-xs text-[#4B4B4B] hover:bg-[#FAFAFA]",
          )}
        >
          Media Studio
        </Link>
        <Link
          href="/avatar-lecture"
          className={cn(buttonVariants({ variant: "chunky", size: "sm" }), "rounded-xl font-sans text-xs")}
        >
          AI Avatar
        </Link>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-10 shrink-0 justify-center gap-2 rounded-xl border-2 border-gray-100 bg-[#FAFAFA] font-sans text-xs text-[#4B4B4B] hover:bg-gray-100"
        onClick={onOpenFinOpsReport}
      >
        <BarChart3 className="size-4" aria-hidden />
        FinOps · 절감 리포트
      </Button>

      <div className="shrink-0">
        <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4B4B4B]/50">
          튜터 페르소나
        </p>
        <div className="flex flex-col gap-2">
          {EDUCATIONAL_PERSONAS.map((p) => {
            const on = selectedPersona?.id === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                layout
                whileTap={{ y: 2, scale: 0.99 }}
                onClick={() => {
                  selectPersona(p.id);
                  if (p.id === "metaphor_mage") {
                    window.dispatchEvent(new CustomEvent("golden-persona-pancake"));
                  }
                }}
                data-golden-target={p.id === "metaphor_mage" ? "pancake-wizard" : undefined}
                className={cn(
                  "persona-card-tactile",
                  personaCardBase,
                  on
                    ? "border-emerald-400 border-b-emerald-600 shadow-sm"
                    : "hover:border-gray-300 hover:border-b-gray-300",
                )}
              >
                <span className="text-xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-sm font-semibold text-[#4B4B4B]">
                    {p.name}
                  </span>
                  <span className="mt-0.5 block font-sans text-[10px] text-[#4B4B4B]/50">{p.level}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 shrink-0 basis-0" aria-hidden />

      <div className="flex shrink-0 flex-col gap-3 border-t-2 border-gray-100 pt-4">
        <SidebarSecuritySummary />
        <SidebarFinOpsGamified
          measuredSavingsPct={measuredSavingsPct}
          totalSavingsUsd={totalSavingsUsd}
          tokensSaved={tokensSaved}
        />
      </div>
    </aside>
  );
}
