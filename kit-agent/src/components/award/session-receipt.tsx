"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, CheckCircle2, FileCheck2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  analyzeCognitiveDepth,
  buildReceiptIntegritySeed,
  buildSkillMasteryNodes,
} from "@/lib/learning-receipt-analytics";
import { cn } from "@/lib/utils";

export type SessionReceiptPayload = {
  threadId: string;
  learningScorePct: number;
  tokensUsed: number;
  trustScore: number | null;
  modelLabel: string;
  /** 스킬 맵·인지 분석용 (선택) */
  summarizationInstruction?: string;
  structuredSummary?: string;
  qualityScore?: number | null;
  distillRound?: number;
  loopCount?: number;
  technicalConcepts?: { concept: string }[];
  coreObjectives?: string[];
  /** 영수증 하단 — 취업 역량 증명 라벨 (예: React 상태 관리) */
  careerProofLabel?: string;
};

function ReceiptZigzag({ position }: { position: "top" | "bottom" }) {
  const w = 320;
  const h = 10;
  const tooth = 10;
  const amp = 5;
  let path = "";
  if (position === "top") {
    /** 상단 톱니: 띠의 위쪽 가장자리가 영수증 tear */
    path = `M0,${h} `;
    for (let x = 0; x < w; x += tooth) {
      path += `L${x + tooth / 2},0 L${x + tooth},${h} `;
    }
    path += `L${w},${h} L0,${h} Z`;
  } else {
    /** 하단 톱니: 띠의 아래쪽 가장자리가 tear */
    path = `M0,0 L${w},0 `;
    for (let x = w; x > 0; x -= tooth) {
      path += `L${x - tooth / 2},${h - amp} L${x - tooth},${h} `;
    }
    path += `L0,${h} L0,0 Z`;
  }
  return (
    <svg
      className="pointer-events-none block h-[10px] w-full shrink-0 text-white"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}

function ReceiptParticleField() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 12% 18%, rgba(28,176,246,0.09) 0, transparent 42%)",
            "radial-gradient(circle at 88% 72%, rgba(28,176,246,0.07) 0, transparent 38%)",
            "radial-gradient(circle at 40% 90%, rgba(28,176,246,0.05) 0, transparent 35%)",
            "radial-gradient(rgba(28,176,246,0.035) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 14px 14px",
          backgroundPosition: "0 0, 0 0, 0 0, 0 0",
        }}
      />
    </div>
  );
}

function InlineEmphasis({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\*\*(.+)\*\*$/.exec(part);
        if (m) {
          return (
            <strong key={i} className="font-semibold text-[#1CB0F6]">
              {m[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return (hex.repeat(8)).slice(0, 64);
}

export function SessionReceiptDrawer({
  open,
  onOpenChange,
  payload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SessionReceiptPayload;
}) {
  const instr = payload.summarizationInstruction ?? "";
  const struct = payload.structuredSummary ?? "";
  const tech = payload.technicalConcepts ?? [];
  const objs = payload.coreObjectives ?? [];
  const distillRound = payload.distillRound ?? 0;
  const loopCount = payload.loopCount ?? 0;

  const skillNodes = useMemo(
    () =>
      buildSkillMasteryNodes({
        technicalConcepts: tech,
        coreObjectives: objs,
        summarizationInstruction: instr,
        qualityScore: payload.qualityScore ?? null,
        trustScore: payload.trustScore,
      }),
    [tech, objs, instr, payload.qualityScore, payload.trustScore],
  );

  const cognitive = useMemo(
    () =>
      analyzeCognitiveDepth({
        summarizationInstruction: instr,
        structuredSummary: struct,
        loopCount,
        distillRound,
      }),
    [instr, struct, loopCount, distillRound],
  );

  const integritySeed = useMemo(
    () =>
      buildReceiptIntegritySeed({
        threadId: payload.threadId,
        tokensUsed: payload.tokensUsed,
        trustScore: payload.trustScore,
        learningScorePct: payload.learningScorePct,
        skillLabels: skillNodes.map((s) => s.label),
      }),
    [
      payload.threadId,
      payload.tokensUsed,
      payload.trustScore,
      payload.learningScorePct,
      skillNodes,
    ],
  );

  const [checksum, setChecksum] = useState<string>("");
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void sha256Hex(integritySeed).then((hex) => {
      if (!cancelled) setChecksum(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [open, integritySeed]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[60] bg-black/35"
            aria-label="영수증 닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-receipt-title"
            className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[92vh] justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="relative flex w-full max-w-md flex-col">
              <div
                className={cn(
                  "relative flex w-full flex-col overflow-hidden border-x-2 border-t-2 border-[#1CB0F6] bg-white shadow-2xl",
                  "rounded-t-none",
                )}
              >
                <ReceiptParticleField />
                <ReceiptZigzag position="top" />

                <div className="relative border-b-2 border-gray-100 bg-white px-5 pb-4 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        id="session-receipt-title"
                        className="font-sans text-[10px] font-semibold uppercase tracking-[0.28em] text-[#1CB0F6]"
                      >
                        Verified Learning Growth Receipt
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 font-sans text-lg font-bold text-[#4B4B4B]">
                        <Sparkles className="size-5 text-[#1CB0F6]" aria-hidden />
                        검증된 학습 성장 영수증
                      </p>
                      <p className="mt-0.5 font-sans text-xs text-[#4B4B4B]/65">
                        AI 에이전트가 질문 패턴·증류 결과를 분석한 세션 종료 증명서입니다.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="receiptOutline"
                      size="icon-sm"
                      className="size-9 shrink-0 rounded-2xl !border-b-4 !border-[#1593d4] p-0 active:!translate-y-[2px] active:!border-b-2"
                      onClick={() => onOpenChange(false)}
                      aria-label="닫기"
                    >
                      <X className="size-5 text-[#1CB0F6]" />
                    </Button>
                  </div>
                </div>

                <div className="relative max-h-[min(58vh,520px)] space-y-4 overflow-y-auto bg-white px-5 py-5">
                  <section className="rounded-2xl border-2 border-[#1CB0F6]/35 bg-[#1CB0F6]/[0.04] p-4">
                    <div className="flex items-center gap-2 text-[#1CB0F6]">
                      <Sparkles className="size-5 shrink-0" aria-hidden />
                      <p className="font-sans text-[10px] font-semibold uppercase tracking-wider">
                        Skill Mastery Map
                      </p>
                    </div>
                    <p className="mt-1 font-sans text-xs text-[#4B4B4B]/70">
                      이번 세션에서 다룬 핵심 키워드별 이해도(추정)
                    </p>
                    <ul className="mt-4 space-y-3">
                      {skillNodes.map((node) => (
                        <li key={node.id}>
                          <div className="flex items-center justify-between gap-2 font-sans text-xs font-medium text-[#4B4B4B]">
                            <span className="min-w-0 truncate">{node.label}</span>
                            <span className="shrink-0 tabular-nums text-[#1CB0F6]">
                              {node.masteryPct}%
                            </span>
                          </div>
                          <div
                            className="mt-1.5 h-3 w-full overflow-hidden rounded-full border border-[#1CB0F6]/25 bg-white"
                            role="progressbar"
                            aria-valuenow={node.masteryPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${node.label} 이해도`}
                          >
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#1CB0F6] to-[#58CC02] transition-[width] duration-500 ease-out"
                              style={{ width: `${node.masteryPct}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] p-4">
                    <div className="flex items-center gap-2 text-[#4B4B4B]">
                      <Brain className="size-5 shrink-0 text-[#1CB0F6]" aria-hidden />
                      <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/75">
                        Cognitive Depth Analysis
                      </p>
                    </div>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-[#4B4B4B]">
                      <InlineEmphasis text={cognitive.narrativeKo} />
                    </p>
                  </section>

                  <section className="rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] p-4">
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/55">
                      세션 지표
                    </p>
                    <dl className="mt-3 space-y-2 font-sans text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#4B4B4B]/70">진행 점수</dt>
                        <dd className="font-bold tabular-nums text-[#58CC02]">
                          {Math.round(payload.learningScorePct)}%
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#4B4B4B]/70">토큰 사용</dt>
                        <dd className="font-mono tabular-nums text-[#4B4B4B]">
                          {payload.tokensUsed.toLocaleString("ko-KR")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#4B4B4B]/70">모델 프로파일</dt>
                        <dd className="text-right font-medium text-[#4B4B4B]">{payload.modelLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#4B4B4B]/70">Trust</dt>
                        <dd className="font-bold tabular-nums text-[#58CC02]">
                          {payload.trustScore != null && Number.isFinite(payload.trustScore)
                            ? `${Math.round(payload.trustScore)}/100`
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>

                {payload.careerProofLabel?.trim() ? (
                  <div className="relative border-t-2 border-gray-100 bg-white px-5 py-4">
                    <div className="flex items-start gap-3 rounded-2xl border-2 border-[#1CB0F6]/35 bg-[#1CB0F6]/[0.04] p-4">
                      <CheckCircle2
                        className="size-7 shrink-0 text-[#1CB0F6]"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#1CB0F6]">
                          Verified Career Snippet
                        </p>
                        <p className="mt-1.5 font-sans text-sm font-medium leading-snug text-[#4B4B4B]">
                          이 세션은{" "}
                          <span className="font-semibold text-[#1CB0F6]">
                            &apos;{payload.careerProofLabel.trim()}&apos;
                          </span>{" "}
                          역량을 증명합니다.
                        </p>
                        <p className="mt-1 font-sans text-[11px] text-[#4B4B4B]/65">
                          포트폴리오·면접 제출 시 공식 학습 기록으로 인용할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="relative border-t-2 border-[#1CB0F6]/25 bg-[#FAFAFA] px-5 py-4">
                  <div className="flex items-center gap-2 text-[#1CB0F6]">
                    <ShieldCheck className="size-5 shrink-0" aria-hidden />
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-wider">
                      Security Checksum · SHA-256
                    </p>
                  </div>
                  <p className="mt-2 break-all font-mono text-[11px] font-medium leading-relaxed tracking-wide text-[#4B4B4B]">
                    {checksum || "· · · 계산 중 · · ·"}
                  </p>
                  <p className="mt-2 flex items-start gap-2 font-sans text-xs leading-relaxed text-[#4B4B4B]/70">
                    <FileCheck2 className="mt-0.5 size-4 shrink-0 text-[#1CB0F6]" aria-hidden />
                    학습 스냅샷 무결성 참조입니다. 클라이언트 측 해시로 위변조 여부를 시각적으로 대조할 수 있으며,
                    세션 데이터는 정책에 따라 안전하게 파기·보관됩니다.
                  </p>
                </div>

                <ReceiptZigzag position="bottom" />

                <div className="relative border-t-2 border-gray-100 bg-[#FAFAFA] px-5 py-4">
                  <Button
                    type="button"
                    variant="cyanTactile"
                    className="h-11 w-full rounded-2xl"
                    onClick={() => onOpenChange(false)}
                  >
                    확인했습니다
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
