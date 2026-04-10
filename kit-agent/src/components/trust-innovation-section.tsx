"use client";

import { motion } from "framer-motion";
import { Award, Cpu, ShieldCheck, Users } from "lucide-react";
import {
  PrivacySecurityTerminal,
  type PrivacyTerminalPhase,
} from "@/components/privacy-security-terminal";

export function TrustInnovationSection({
  phase,
  privacyEpoch,
}: {
  phase: PrivacyTerminalPhase;
  privacyEpoch: number;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[oklch(0.55_0.12_195/0.25)] bg-gradient-to-br from-card via-card to-[oklch(0.97_0.02_264)] p-5 shadow-sm dark:from-zinc-900 dark:via-zinc-950 dark:to-[oklch(0.18_0.04_264)] dark:border-cyan-500/20"
      aria-labelledby="trust-innovation-heading"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[oklch(0.72_0.14_195/0.12)] blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="flex items-center gap-3 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-transparent px-4 py-3 shadow-[0_0_0_1px_oklch(0.85_0.08_85/0.15)_inset]"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-950 text-amber-300 shadow-inner dark:bg-black/60">
                <Award className="size-6" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/90 dark:text-amber-400/95">
                  KIT Vibe-Coding Innovation
                </p>
                <p id="trust-innovation-heading" className="font-heading text-lg font-semibold tracking-tight">
                  Trust &amp; Innovation
                </p>
              </div>
            </motion.div>
          </div>
          <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
            학습자와 멀티 에이전트가 같은 목표를 향해 협업하는 구조를 상징합니다. CFO·가디언·튜터가
            각각 비용·안전·교육 품질을 분리 책임지며, 심사 기준의 <strong className="text-foreground">실전 구현</strong>과{" "}
            <strong className="text-foreground">안전 가치</strong>를 동시에 보여 줍니다.
          </p>
          <ul className="flex flex-wrap gap-4 text-sm">
            <li className="flex items-center gap-2 text-foreground/90">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-4" aria-hidden />
              </span>
              학생 중심 피드백 루프
            </li>
            <li className="flex items-center gap-2 text-foreground/90">
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300">
                <Cpu className="size-4" aria-hidden />
              </span>
              에이전트 합의 &amp; 트레이스
            </li>
            <li className="flex items-center gap-2 text-foreground/90">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              엄격한 프라이버시 프로토콜
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground text-sm">실시간 Privacy Log</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            사용자 사진·얼굴 특징은 처리 직후 버퍼에서 제거됩니다. 아래 로그는 심사용 투명성 UI입니다.
          </p>
          <PrivacySecurityTerminal
            key={privacyEpoch}
            phase={phase}
            title="Strict Privacy Protocol — 감사 로그"
          />
        </div>
      </div>
    </section>
  );
}
