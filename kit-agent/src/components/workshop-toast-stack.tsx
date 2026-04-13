"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useWorkshopExperience } from "@/components/workshop-experience-context";
import { cn } from "@/lib/utils";

/**
 * id="toast-container" — 심사·데모용 토스트 스택 (고정 하단).
 */
export function WorkshopToastStack({ className }: { className?: string }) {
  const { toasts, dismissToast } = useWorkshopExperience();

  return (
    <div
      id="toast-container"
      className={cn(
        "pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[80] flex w-[min(100%-1.5rem,420px)] -translate-x-1/2 flex-col gap-2 sm:bottom-8 lg:bottom-6",
        className,
      )}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="pointer-events-auto rounded-2xl border-2 border-emerald-200/90 bg-white/95 px-4 py-3 text-sm font-medium text-emerald-900 shadow-[0_4px_0_0_rgb(167_243_208)] backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="rounded-lg px-1.5 text-xs text-emerald-700/70 hover:bg-emerald-50 hover:text-emerald-900"
              >
                닫기
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
