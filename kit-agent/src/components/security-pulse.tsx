"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSecurityPulse } from "@/components/security-pulse-context";
import type { SecurityPulsePhase } from "@/lib/security-pulse-state";
import {
  SECURITY_AUDIT_RECEIPT_STORAGE_KEY,
  type DeletionReceipt,
} from "@/lib/security/deletion-receipt";

function RippleBurst({ burstKey }: { burstKey: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`${burstKey}-${i}`}
          className="absolute inline-flex size-24 rounded-full border-2 border-emerald-400/90 bg-emerald-400/10"
          initial={{ scale: 0.35, opacity: 0.85 }}
          animate={{
            scale: [0.35, 2.45],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1.05,
            delay: i * 0.16,
            ease: [0.22, 1, 0.36, 1],
            repeat: 2,
            repeatDelay: 0.35,
          }}
        />
      ))}
    </span>
  );
}

function PhaseVisual({
  phase,
  rippleBurstKey,
}: {
  phase: SecurityPulsePhase;
  rippleBurstKey: number;
}) {
  if (phase === "idle") {
    return (
      <motion.span
        className="relative flex size-12 items-center justify-center rounded-2xl bg-slate-200/90 shadow-inner dark:bg-slate-700/80"
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(59,130,246,0.35)",
            "0 0 0 14px rgba(59,130,246,0)",
            "0 0 0 0 rgba(59,130,246,0)",
          ],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.span
          className="absolute inset-1 rounded-xl bg-gradient-to-br from-slate-300/90 via-sky-400/50 to-blue-500/40 opacity-80"
          animate={{ opacity: [0.45, 0.85, 0.45] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <Shield className="relative size-6 text-slate-700 dark:text-slate-100" aria-hidden />
      </motion.span>
    );
  }

  if (phase === "active") {
    return (
      <motion.span
        className="relative flex size-12 items-center justify-center rounded-2xl bg-amber-400/25 shadow-[0_0_24px_-4px_rgba(245,158,11,0.75)]"
        animate={{ rotate: [0, 1.5, -1.5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.span
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-300/50 to-orange-500/30"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <Lock className="relative size-6 text-amber-950 dark:text-amber-100" aria-hidden />
      </motion.span>
    );
  }

  return (
    <span className="relative flex size-12 items-center justify-center">
      <RippleBurst burstKey={rippleBurstKey} />
      <motion.span
        className="relative flex size-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_28px_-6px_rgba(16,185,129,0.9)]"
        initial={{ scale: 0.85 }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
      >
        <Sparkles className="size-6 text-white" aria-hidden />
      </motion.span>
    </span>
  );
}

const COPY: Record<
  SecurityPulsePhase,
  { title: string; subtitle: string; badge: string }
> = {
  idle: {
    badge: "Privacy Guard: Standby",
    title: "Zero-trust 채널 대기",
    subtitle:
      "Security_Guardian 에이전트가 세션 업로드를 감사합니다. 학습 파이프라인·미디어 합성이 시작되면 상태가 전환됩니다.",
  },
  active: {
    badge: "Encrypting & Processing…",
    title: "암호화 및 처리 중",
    subtitle:
      "아바타·영상 합성(synthesis)이 진행 중입니다. 원본 프레임은 격리 버퍼에서만 처리됩니다.",
  },
  success: {
    badge: "Zero-Trust Verified",
    title: "Zero-Trust Verified: Raw Biometric Data Permanently Purged",
    subtitle:
      "서버·처리 파이프라인에서 원시 바이오메트릭 데이터가 제거된 것으로 Security_Guardian이 확인했습니다.",
  },
};

export function SecurityPulse() {
  const { snapshot, setDeletionReceipt } = useSecurityPulse();
  const { phase, isPhotoDeleted, deletion_receipt } = snapshot;
  const copy = COPY[phase];
  const [rippleEpoch, setRippleEpoch] = useState(0);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SECURITY_AUDIT_RECEIPT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DeletionReceipt;
      if (parsed?.unique_audit_signature && parsed?.file_hash) {
        setDeletionReceipt(parsed);
      }
    } catch {
      // ignore parse/storage errors
    }
  }, [setDeletionReceipt]);
  useEffect(() => {
    if (phase === "success") setRippleEpoch((n) => n + 1);
  }, [phase]);

  return (
    <div
      className="relative mt-8 overflow-hidden rounded-3xl border-2 border-[#46A302]/40 bg-white/90 p-4 shadow-[0_8px_0_0_rgba(21,128,61,0.25)] dark:bg-slate-900/90 dark:border-emerald-700/50"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="relative flex shrink-0 items-center justify-center sm:pl-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              <PhaseVisual phase={phase} rippleBurstKey={rippleEpoch} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              "inline-flex max-w-full flex-wrap items-center gap-2 rounded-full px-3 py-1 font-extrabold text-[11px] uppercase tracking-wide",
              phase === "idle" && "bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
              phase === "active" && "bg-amber-400/90 text-amber-950",
              phase === "success" && "bg-emerald-500 text-white shadow-sm",
            )}
          >
            {copy.badge}
          </p>
          <h3 className="font-extrabold text-[#1e293b] text-base leading-snug tracking-tight dark:text-slate-50 md:text-lg">
            {copy.title}
          </h3>
          <p className="text-pretty text-[#475569] text-xs leading-relaxed dark:text-slate-400 md:text-sm">
            {copy.subtitle}
          </p>
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-500">
            Security_Guardian trace · isPhotoDeleted={String(isPhotoDeleted)}
          </p>
          <details className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-50/60 p-2.5 dark:border-emerald-700/50 dark:bg-emerald-950/20">
            <summary className="cursor-pointer list-none font-mono text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              Audit Receipt (technical)
            </summary>
            {deletion_receipt ? (
              <dl className="mt-2 space-y-1.5 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                <div>
                  <dt className="text-slate-500">file_hash (sha256)</dt>
                  <dd className="break-all">{deletion_receipt.file_hash}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">deletion_timestamp</dt>
                  <dd>{deletion_receipt.deletion_timestamp}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">api_response_id</dt>
                  <dd>{deletion_receipt.api_response_id}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">unique_audit_signature</dt>
                  <dd className="break-all">{deletion_receipt.unique_audit_signature}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 font-mono text-[10px] text-slate-500">
                receipt unavailable — submit Privacy Protocol ack in Avatar Lecture flow.
              </p>
            )}
          </details>
        </div>
      </div>
    </div>
  );
}
