"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EDUCATIONAL_PERSONAS } from "@/constants/personas";
import { useEducationalPersona } from "@/components/educational-persona-context";
import { useWorkshopExperience } from "@/components/workshop-experience-context";
import { MaterialSymbol } from "@/components/material-symbol";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { selectedPersona, selectPersona } = useEducationalPersona();
  const { setSettingsOpen, setHelpOpen } = useWorkshopExperience();

  return (
    <aside
      className="flex h-full min-h-0 w-72 shrink-0 flex-col gap-4 border-r-0 bg-pw-surface-container-low px-4 py-6"
      role="complementary"
      aria-label="튜터 및 워크숍 내비게이션"
    >
      <div className="mb-1">
        <h1 className="font-headline text-lg font-bold tracking-tighter text-slate-900">
          Tutors
        </h1>
        <p className="text-xs font-medium text-slate-500">Select your guide</p>
      </div>

      <nav
        className="custom-scroll flex flex-1 flex-col gap-3 overflow-y-auto pr-1"
        aria-label="튜터 선택"
      >
        {EDUCATIONAL_PERSONAS.map((p) => {
          const active = selectedPersona?.id === p.id;
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
                "persona-card-tactile flex flex-col gap-1 rounded-xl border-b-4 bg-white p-4 text-left shadow-sm transition-all active:translate-y-px active:border-b-0",
                active
                  ? cn(
                      "border-[color:var(--pw-persona-accent,#006c49)] pulse-glow",
                      "ring-1 ring-[color:var(--pw-persona-accent,#006c49)]/25",
                    )
                  : "border-pw-surface-container-highest hover:bg-slate-50",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {p.emoji}
                </span>
                <span className="font-headline text-sm font-bold text-pw-on-surface">
                  {p.name}
                </span>
              </div>
              <p className="text-xs text-pw-on-surface-variant">{p.shortDescription}</p>
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-pw-surface-container pt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 p-2 text-sm font-medium text-slate-500 transition-colors hover:text-[color:var(--pw-persona-accent,#006c49)]"
        >
          <MaterialSymbol name="dashboard" className="text-[20px]" />
          <span>학습 대시보드</span>
        </Link>
        <motion.button
          type="button"
          whileTap={{ y: 2, scale: 0.98 }}
          onClick={() => setSettingsOpen(true)}
          className="tactile-button flex items-center gap-3 p-2 text-left text-sm font-medium text-slate-500 transition-colors hover:text-[color:var(--pw-persona-accent,#006c49)]"
        >
          <MaterialSymbol name="settings" className="text-[20px]" />
          <span>Settings</span>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ y: 2, scale: 0.98 }}
          onClick={() => setHelpOpen(true)}
          className="tactile-button flex items-center gap-3 p-2 text-left text-sm font-medium text-slate-500 transition-colors hover:text-[color:var(--pw-persona-accent,#006c49)]"
        >
          <MaterialSymbol name="help" className="text-[20px]" />
          <span>Help</span>
        </motion.button>
      </div>
    </aside>
  );
}
