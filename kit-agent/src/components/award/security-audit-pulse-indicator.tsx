"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/** 화면 구석 — 보안 감사 실시간 박동 (사이안) */
export function SecurityAuditPulseIndicator({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (!active) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 right-6 z-[35] flex flex-col items-center gap-1 md:bottom-8 md:right-8",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="보안 감사 진행 중"
    >
      <div className="relative flex size-14 items-center justify-center">
        {!reduce ? (
          <>
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[#1CB0F6]/45"
              animate={{ scale: [1, 1.32, 1], opacity: [0.5, 0.08, 0.5] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
            />
            <motion.span
              className="absolute inset-1 rounded-full border border-[#1CB0F6]/30"
              animate={{ scale: [1, 1.18, 1], opacity: [0.38, 0.12, 0.38] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
            />
          </>
        ) : null}
        <span className="relative flex size-12 items-center justify-center rounded-full border-2 border-[#1CB0F6] bg-white shadow-sm">
          <Shield className="size-6 text-[#1CB0F6]" strokeWidth={2} aria-hidden />
        </span>
      </div>
      <span className="max-w-[5.5rem] text-center font-sans text-[9px] font-semibold uppercase leading-tight tracking-wide text-[#1CB0F6]">
        보안 감사
      </span>
    </div>
  );
}
