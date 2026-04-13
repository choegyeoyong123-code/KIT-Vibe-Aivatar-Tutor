"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MaterialSymbol } from "@/components/material-symbol";
import { SecurityTrustDialog } from "@/components/modals/security-pulse-modal";
import { useVibe } from "@/components/vibe-context";

const DEMO_PROFILE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBL-37Uz-j7CAR_0CqtMYMrbnj5KH8QiORGjU5tm3i1j5hDUVSGj4k9qLjEGhpT4fIxPxkSc8BTyN6QwI1zwfVxDF_yXy3vyvkfROGZhypIdU2Xvi4Yki-3HyB16BVfaBeQ5WRkMxPqcRal3i_CFw-kkdmvuxKREfu9_fC1fRt3_S4SdK6ErTqWN4C2eiBHyiBYLOOtGxA8PfIQ7pIRgPkorBM29i1zfQOz5WKk7H6lI37FN8mXzHSjNTbOAhXHGTvG1kxAWjSEzjg";

export function Header() {
  const { mode, setMode, currentCostUsd, accentHex } = useVibe();
  const [securityOpen, setSecurityOpen] = useState(false);

  return (
    <header className="glass-morphism z-50 flex h-16 min-h-16 shrink-0 items-center gap-2 border-b border-white/40 px-3 backdrop-blur-xl sm:gap-3 sm:px-6 lg:px-8">
      <div className="min-w-0 max-w-[38%] shrink sm:max-w-[min(14rem,42%)]">
        <span
          className="block truncate font-headline text-base font-black tracking-tighter sm:text-xl lg:text-2xl"
          style={{
            color: accentHex,
          }}
          title="Pristine Workshop"
        >
          Pristine Workshop
        </span>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-min items-center justify-end gap-2 pr-1 sm:justify-center">
          <div className="flex shrink-0 rounded-full border-b-2 border-pw-surface-container bg-pw-surface-container-low/90 p-1 shadow-sm backdrop-blur-md">
            <motion.button
              type="button"
              whileTap={{ y: 2, scale: 0.98 }}
              onClick={() => setMode("eco")}
              className={cn(
                "tactile-button flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:text-sm",
                mode === "eco"
                  ? "bg-white text-pw-on-primary-container shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <span aria-hidden>🌿</span>
              <span className="hidden sm:inline">ECO 모드</span>
              <span className="sm:hidden">ECO</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ y: 2, scale: 0.98 }}
              onClick={() => setMode("high")}
              className={cn(
                "tactile-button flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:text-sm",
                mode === "high"
                  ? "bg-white text-pw-on-primary-container shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <span aria-hidden>⚡</span>
              <span className="hidden sm:inline">HIGH 모드</span>
              <span className="sm:hidden">HIGH</span>
            </motion.button>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-pw-surface-container-low/90 px-2 py-1 shadow-sm backdrop-blur-md sm:px-3">
            <MaterialSymbol
              name="payments"
              fill
              className="text-[0.95rem] text-pw-secondary sm:text-[16px]"
            />
            <span className="whitespace-nowrap font-mono text-[10px] font-bold tabular-nums text-pw-on-surface-variant sm:text-[11px]">
              세션 ${currentCostUsd.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <motion.button
          type="button"
          whileTap={{ y: 2, scale: 0.98 }}
          onClick={() => setSecurityOpen(true)}
          className={cn(
            "flex items-center gap-1 rounded-full bg-pw-surface-container-low/90 px-1.5 py-1 shadow-sm backdrop-blur-md transition hover:bg-pw-surface-container/80 sm:gap-1.5 sm:px-3",
            "pulse-glow",
          )}
          aria-label="보안 및 개인정보 안내 열기"
        >
          <span className="kit-privacy-shield relative flex size-[1.15rem] items-center justify-center rounded-full bg-emerald-50 ring-2 ring-emerald-100/80 sm:size-5">
            <MaterialSymbol
              name="shield"
              fill
              className="text-[0.85rem] text-[color:var(--pw-persona-accent,#006c49)] sm:text-[16px]"
            />
          </span>
          <span className="hidden text-[11px] font-bold text-pw-on-surface-variant sm:inline">
            🔒 안전
          </span>
        </motion.button>
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEMO_PROFILE}
            alt="프로필"
            width={32}
            height={32}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
      <SecurityTrustDialog open={securityOpen} onOpenChange={setSecurityOpen} />
    </header>
  );
}
