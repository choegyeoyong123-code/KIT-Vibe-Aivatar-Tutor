"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { FinOpsEfficiencyEnginePanel } from "@/components/panels/finops-efficiency-engine-panel";
import { SecurityPulseDataPanel } from "@/components/panels/security-pulse-data-panel";
import { glassPanelClass, kitSurfaceBorder } from "@/lib/glass-styles";
import { cn } from "@/lib/utils";

function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(glassPanelClass({ hover: true }), "p-6", className)}>
      {children}
    </div>
  );
}

export type DashboardGlassContainerProps = {
  /** Optional slot below the glass grid (e.g. wrap `LearningDashboard` main column). */
  children?: ReactNode;
  className?: string;
};

/**
 * 대시보드 셸 — 순백 기반, 카드는 shadow-sm + 호버 시 사이안 테두리
 */
export function DashboardGlassContainer({
  children,
  className,
}: DashboardGlassContainerProps) {
  return (
    <section
      className={cn("relative overflow-hidden border-y bg-white", kitSurfaceBorder, className)}
      aria-label="KIT Aivatar dashboard"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(6,182,212,0.06),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1920px] px-5 py-10 md:px-10 md:py-14">
        <header className="mb-10 max-w-2xl">
          <p className="font-light text-[10px] text-cyan-600 uppercase tracking-[0.35em]">
            Orchestrator
          </p>
          <h1 className="mt-2 font-light text-3xl tracking-tight text-cyan-700 md:text-4xl">
            Command surface
          </h1>
          <p className="mt-2 font-light text-sm leading-relaxed text-slate-600 md:text-base">
            Multi-agent 학습 콘솔 — FinOps·보안·튜터 상태를 한 눈에 정렬합니다.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-3">
            <FinOpsEfficiencyEnginePanel className="min-h-[min(280px,42vh)]" />
          </div>

          <GlassCard className="flex min-h-[min(52vh,520px)] flex-col items-center justify-center gap-6 lg:col-span-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.06),transparent_65%)]" />
            <div className="relative w-full max-w-md px-4">
              <div className="relative mx-auto aspect-square w-full max-w-[280px] md:max-w-[320px]">
                <Image
                  src="/images/image_12.png"
                  alt="KIT Aivatar — core tutor unit"
                  fill
                  priority
                  sizes="(max-width: 768px) 90vw, 320px"
                  className="object-contain object-center drop-shadow-md"
                />
              </div>
            </div>
            <div className="relative text-center">
              <p className="font-light text-[10px] text-cyan-600 uppercase tracking-[0.3em]">
                Core unit
              </p>
              <p className="mt-2 font-light text-xl tracking-tight text-slate-800 md:text-2xl">
                Aivatar Tutor
              </p>
              <p className="mx-auto mt-2 max-w-sm font-light text-xs leading-relaxed text-slate-600 md:text-sm">
                멀티 에이전트 오케스트레이션의 시각적 앵커입니다.
              </p>
            </div>
          </GlassCard>

          <div className="lg:col-span-3">
            <SecurityPulseDataPanel />
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <GlassCard>
            <p className="font-light text-[10px] text-slate-500 uppercase tracking-[0.2em]">
              Persona
            </p>
            <p className="mt-3 font-light text-lg tracking-tight text-slate-800">Mentor sync</p>
            <p className="mt-2 font-light text-xs leading-relaxed text-slate-600">
              갤러리 선택이 증류·아바타 파이프라인과 정렬됩니다.
            </p>
          </GlassCard>
          <GlassCard>
            <p className="font-light text-[10px] text-slate-500 uppercase tracking-[0.2em]">
              Stream
            </p>
            <p className="mt-3 font-light text-lg tracking-tight text-slate-800">Live summary</p>
            <p className="mt-2 font-light text-xs leading-relaxed text-slate-600">
              NDJSON 델타와 트레이스를 병렬 표시.
            </p>
          </GlassCard>
        </div>

        {children ? (
          <div className={cn("relative mt-10 border-t pt-10", kitSurfaceBorder)}>{children}</div>
        ) : null}
      </div>
    </section>
  );
}
