"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { useSecurityPulse } from "@/components/security-pulse-context";
import {
  SECURITY_AUDIT_RECEIPT_STORAGE_KEY,
  type DeletionReceipt,
} from "@/lib/security/deletion-receipt";

/** 페르소나 갤러리 등 — 텍스트 지표만, 영수증·데모 버튼 없음 */
export function SecurityPulse() {
  const { snapshot, setDeletionReceipt } = useSecurityPulse();
  const { phase, isPhotoDeleted, deletion_receipt } = snapshot;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SECURITY_AUDIT_RECEIPT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DeletionReceipt;
      if (parsed?.unique_audit_signature && parsed?.file_hash) {
        setDeletionReceipt(parsed);
      }
    } catch {
      // ignore
    }
  }, [setDeletionReceipt]);

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
      ? `감사 서명 ${deletion_receipt.unique_audit_signature.slice(0, 10)}…`
      : null;

  const borderClass = safe
    ? "border-emerald-400"
    : active
      ? "border-[#1CB0F6]"
      : "border-gray-200";
  const titleClass = safe ? "text-emerald-600" : active ? "text-[#1CB0F6]" : "text-[#4B4B4B]";

  return (
    <div
      className={`relative mt-8 rounded-2xl border-2 bg-white p-5 transition-colors ${borderClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex size-12 shrink-0 items-center justify-center" aria-hidden>
          {active ? (
            <>
              <motion.span
                className="pointer-events-none absolute inset-[-4px] rounded-2xl border border-[#1CB0F6]/35"
                animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.12, 0.45] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: [0.42, 0, 0.58, 1] }}
              />
              <motion.span
                className="pointer-events-none absolute inset-[-2px] rounded-2xl border border-[#1CB0F6]/25"
                animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.08, 0.35] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: [0.42, 0, 0.58, 1], delay: 0.4 }}
              />
            </>
          ) : null}
          <div
            className={`relative flex size-12 items-center justify-center rounded-2xl ${
              safe ? "bg-emerald-500/10" : active ? "bg-[#1CB0F6]/10" : "bg-gray-100"
            }`}
          >
            <Shield
              className={`size-7 ${safe ? "text-emerald-600" : active ? "text-[#1CB0F6]" : "text-[#4B4B4B]/45"}`}
              strokeWidth={2}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4B4B4B]/55">
            Security Pulse
          </p>
          <p className={`mt-0.5 font-sans text-lg font-bold ${titleClass}`}>{title}</p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-[#4B4B4B]/65">{subtitle}</p>
          {receiptHint ? (
            <p className="mt-2 font-mono text-[10px] text-[#4B4B4B]/55">{receiptHint}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
