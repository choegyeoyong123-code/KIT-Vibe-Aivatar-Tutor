"use client";

import { motion } from "framer-motion";
import { EDUCATIONAL_PERSONAS } from "@/constants/personas";
import { useEducationalPersona } from "@/components/educational-persona-context";
import { cn } from "@/lib/utils";

const card =
  "flex shrink-0 flex-col items-center gap-1 rounded-2xl border-2 border-b-4 border-gray-100 bg-white px-2 py-2.5 text-center shadow-[0_2px_0_0_rgb(229_231_235)] transition-transform active:translate-y-0.5 sm:w-full sm:py-3";

/**
 * Zen 좌측 — 이모지 + 이름만, 터치 친화적 슬림 카드.
 */
export function ZenSlimPersonaRail({ className }: { className?: string }) {
  const { selectedPersona, selectPersona } = useEducationalPersona();

  return (
    <aside
      className={cn(
        "flex shrink-0 gap-2 overflow-x-auto pb-1 sm:w-[5.5rem] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:pb-0 lg:hidden",
        className,
      )}
      aria-label="튜터 페르소나"
    >
      {EDUCATIONAL_PERSONAS.map((p) => {
        const on = selectedPersona?.id === p.id;
        return (
          <motion.button
            key={p.id}
            type="button"
            layout
            whileTap={{ y: 2, scale: 0.98 }}
            onClick={() => {
              selectPersona(p.id);
              if (p.id === "metaphor_mage") {
                window.dispatchEvent(new CustomEvent("golden-persona-pancake"));
              }
            }}
            data-golden-target={p.id === "metaphor_mage" ? "pancake-wizard" : undefined}
            className={cn(
              "persona-card-tactile",
              card,
              on
                ? "border-emerald-300 border-b-emerald-600 ring-1 ring-emerald-200/80"
                : "hover:border-gray-200",
            )}
          >
            <span className="text-xl leading-none" aria-hidden>
              {p.emoji}
            </span>
            <span className="max-w-[4.5rem] font-sans text-[10px] font-semibold leading-tight text-[#4B4B4B] sm:max-w-none sm:text-[11px]">
              {p.name}
            </span>
            {on ? (
              <span
                className="kit-breathe mt-0.5 size-1.5 rounded-full bg-[var(--kit-workshop-accent,#34d399)]"
                aria-hidden
              />
            ) : null}
          </motion.button>
        );
      })}
    </aside>
  );
}
