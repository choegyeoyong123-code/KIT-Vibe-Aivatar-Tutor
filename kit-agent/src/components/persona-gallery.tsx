"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { glassPanelClass, kitSurfaceBorder } from "@/lib/glass-styles";
import { usePersonaGallery } from "@/components/persona-gallery-context";
import { SecurityPulse } from "@/components/security-pulse";
import { TokenSavingsReport } from "@/components/token-savings-report";
import { PersonaMentorImage } from "@/components/persona-mentor-image";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";
import { personaLabelKo } from "@/lib/agent/persona/persona-presets";

const springCard = { type: "spring" as const, stiffness: 380, damping: 28, mass: 0.85 };
const springTap = { type: "spring" as const, stiffness: 600, damping: 32 };

const CARDS: {
  id: DynamicPersonaId;
  title: string;
  blurb: string;
  ring: string;
  glow: string;
}[] = [
  {
    id: "warm_instructor",
    title: "Warm Teacher",
    blurb: "따뜻한 격려와 또렷한 설명 — 시험까지 함께하는 멘토.",
    ring: "ring-fuchsia-400/60",
    glow: "from-fuchsia-200/80 to-rose-100/50",
  },
  {
    id: "strict_coach",
    title: "Strict Expert",
    blurb: "기준과 근거를 세우는 코치 — 허술함을 바로잡아 줍니다.",
    ring: "ring-cyan-400/70",
    glow: "from-cyan-200/80 to-sky-100/50",
  },
  {
    id: "energetic_rapper",
    title: "Creative Mentor",
    blurb: "리듬과 운율로 개념을 각인 — 에너지 넘치는 창의 멘토.",
    ring: "ring-violet-400/60",
    glow: "from-violet-200/80 to-purple-100/50",
  },
  {
    id: "zen_guide",
    title: "Zen Guide",
    blurb: "느린 호흡, 차분한 문장 — 야간 복습·집중에 어울려요.",
    ring: "ring-emerald-400/60",
    glow: "from-emerald-200/80 to-teal-100/50",
  },
  {
    id: "curious_explorer",
    title: "Curious Explorer",
    blurb: "질문으로 지도를 펼치는 탐험가 — 프로젝트형 학습에 맞춤.",
    ring: "ring-amber-400/60",
    glow: "from-amber-200/80 to-orange-100/50",
  },
];

export function PersonaGallery() {
  const { selectedPersonaId, setSelectedPersonaId } = usePersonaGallery();
  const [finOpsOpen, setFinOpsOpen] = useState(false);

  return (
    <section
      className={cn("relative overflow-hidden border-b bg-white text-slate-800", kitSurfaceBorder)}
      aria-labelledby="persona-gallery-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "url(/images/personas/section-pattern.svg)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-0 size-[min(100vw,480px)] rounded-full bg-cyan-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-[min(90vw,420px)] rounded-full bg-sky-100/35 blur-3xl" />

      <div className="relative mx-auto max-w-[1920px] px-5 py-12 md:px-10 md:py-16">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 font-medium text-cyan-700 text-xs shadow-sm",
                kitSurfaceBorder,
              )}
            >
              <Sparkles className="size-3.5 text-cyan-600" aria-hidden />
              KIT Vibe-Coding · Persona Gallery
            </motion.p>
            <h2
              id="persona-gallery-heading"
              className="mt-5 font-semibold text-3xl leading-tight tracking-tight text-cyan-600 md:text-4xl"
            >
              Select Your Mentor
            </h2>
            <p className="mt-3 max-w-xl text-pretty font-medium text-lg leading-snug text-slate-800 md:text-xl">
              오늘의 학습은 어떤 스타일로 할까요? 카드만 눌러도 전체 튜터 톤이 한 번에 맞춰져요.
            </p>
            <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-slate-600 md:text-base">
              멘토를 고르면{" "}
              <strong className="font-semibold text-emerald-700">currentPersona</strong>
              가 갱신되고, 증류·아바타 파이프라인이 같은 목소리로 정렬됩니다. 실패 없이 다시 도전해도
              괜찮아요 — 당신 페이스가 우선이에요.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <Button
              type="button"
              onClick={() => setFinOpsOpen(true)}
              className={cn(
                glassPanelClass({ hover: true, rounded: "xl" }),
                "h-12 shrink-0 border-emerald-200 bg-emerald-50 px-6 font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100",
              )}
            >
              <BarChart3 className="size-4" aria-hidden />
              Token Savings
            </Button>
          </motion.div>
        </div>

        <TokenSavingsReport open={finOpsOpen} onOpenChange={setFinOpsOpen} />

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {CARDS.map((c, idx) => {
            const selected = selectedPersonaId === c.id;
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springCard, delay: idx * 0.05 }}
                className="list-none"
              >
                <motion.button
                  type="button"
                  layout
                  onClick={() => setSelectedPersonaId(c.id)}
                  whileTap={{
                    scale: 0.96,
                    y: 3,
                    transition: springTap,
                  }}
                  transition={springCard}
                  className={cn(
                    glassPanelClass({ hover: true, rounded: "3xl" }),
                    "group flex h-full w-full flex-col p-5 text-left",
                    selected && cn("border-cyan-500 ring-2 ring-cyan-500/25 ring-offset-2 ring-offset-white", c.ring),
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-gradient-to-br opacity-70 blur-2xl transition-opacity group-hover:opacity-90",
                      c.glow,
                    )}
                  />
                  <div
                    className={cn(
                      "relative mb-4 flex h-[100px] min-h-[100px] items-center justify-center rounded-2xl border bg-slate-50",
                      kitSurfaceBorder,
                    )}
                  >
                    <PersonaMentorImage
                      personaId={c.id}
                      priority={idx < 4}
                      className="drop-shadow-md"
                    />
                  </div>
                  <h3 className="relative font-semibold text-lg leading-tight tracking-tight text-slate-800">
                    {c.title}
                  </h3>
                  <p className="relative mt-1 font-medium text-[11px] text-cyan-600 uppercase tracking-wide">
                    {personaLabelKo(c.id)}
                  </p>
                  <p className="relative mt-2 flex-1 text-pretty text-sm leading-snug text-slate-600">
                    {c.blurb}
                  </p>
                  {selected ? (
                    <motion.div
                      layout
                      className="relative mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 text-xs shadow-sm"
                    >
                      <Sparkles className="size-3.5 text-emerald-600" aria-hidden />
                      선택됨!
                    </motion.div>
                  ) : (
                    <span className="relative mt-4 font-medium text-slate-500 text-xs transition-colors group-hover:text-slate-700">
                      눌러서 멘토 지정
                    </span>
                  )}
                </motion.button>
              </motion.li>
            );
          })}
        </ul>

        <SecurityPulse />
      </div>
    </section>
  );
}
