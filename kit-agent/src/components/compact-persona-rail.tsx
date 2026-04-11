"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassPanelClass, kitSurfaceBorder } from "@/lib/glass-styles";
import { usePersonaGallery } from "@/components/persona-gallery-context";
import { PersonaMentorImage } from "@/components/persona-mentor-image";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";
import { personaLabelKo } from "@/lib/agent/persona/persona-presets";

const IDS: DynamicPersonaId[] = [
  "warm_instructor",
  "strict_coach",
  "energetic_rapper",
  "zen_guide",
  "curious_explorer",
];

export function CompactPersonaRail() {
  const { selectedPersonaId, setSelectedPersonaId } = usePersonaGallery();

  return (
    <div className={cn(glassPanelClass({ hover: false }), "p-4")}>
      <p className="mb-3 flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
        <Sparkles className="size-3 text-cyan-600" aria-hidden />
        멘토
      </p>
      <div className="flex flex-wrap gap-2">
        {IDS.map((id) => {
          const on = selectedPersonaId === id;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => setSelectedPersonaId(id)}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-colors",
                on
                  ? "border-cyan-500 bg-cyan-50 shadow-sm"
                  : cn("bg-slate-50", kitSurfaceBorder, "hover:border-cyan-400"),
              )}
              title={personaLabelKo(id)}
            >
              <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
                <span className="origin-center scale-[0.38]">
                  <PersonaMentorImage personaId={id} priority={false} />
                </span>
              </span>
              <span className="max-w-[4.5rem] truncate text-center font-sans text-[9px] text-slate-600 leading-tight">
                {personaLabelKo(id)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
