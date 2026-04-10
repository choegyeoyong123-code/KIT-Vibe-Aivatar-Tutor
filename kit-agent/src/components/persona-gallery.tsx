"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePersonaGallery } from "@/components/persona-gallery-context";
import { SecurityPulse } from "@/components/security-pulse";
import { TokenSavingsReport } from "@/components/token-savings-report";
import { PersonaMentorImage } from "@/components/persona-mentor-image";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";
import { personaLabelKo } from "@/lib/agent/persona/persona-presets";

const CARDS: {
  id: DynamicPersonaId;
  title: string;
  blurb: string;
  cardBg: string;
  border: string;
  shadow: string;
}[] = [
  {
    id: "warm_instructor",
    title: "Warm Teacher",
    blurb: "따뜻한 격려와 또렷한 설명 — 시험까지 함께하는 멘토.",
    cardBg: "bg-[#FFF5F7]",
    border: "border-[#F472B6]/40",
    shadow: "shadow-[0_8px_0_0_#DB2777]",
  },
  {
    id: "strict_coach",
    title: "Strict Expert",
    blurb: "기준과 근거를 세우는 코치 — 허술함을 바로잡아 줍니다.",
    cardBg: "bg-[#EFF6FF]",
    border: "border-[#38BDF8]/50",
    shadow: "shadow-[0_8px_0_0_#0284C7]",
  },
  {
    id: "energetic_rapper",
    title: "Creative Mentor",
    blurb: "리듬과 운율로 개념을 각인 — 에너지 넘치는 창의 멘토.",
    cardBg: "bg-[#FAF5FF]",
    border: "border-[#C084FC]/45",
    shadow: "shadow-[0_8px_0_0_#9333EA]",
  },
  {
    id: "zen_guide",
    title: "Zen Guide",
    blurb: "느린 호흡, 차분한 문장 — 야간 복습·집중에 어울려요.",
    cardBg: "bg-[#ECFDF5]",
    border: "border-[#34D399]/45",
    shadow: "shadow-[0_8px_0_0_#059669]",
  },
  {
    id: "curious_explorer",
    title: "Curious Explorer",
    blurb: "질문으로 지도를 펼치는 탐험가 — 프로젝트형 학습에 맞춤.",
    cardBg: "bg-[#FFFBEB]",
    border: "border-[#FBBF24]/55",
    shadow: "shadow-[0_8px_0_0_#D97706]",
  },
];

export function PersonaGallery() {
  const { selectedPersonaId, setSelectedPersonaId } = usePersonaGallery();
  const [finOpsOpen, setFinOpsOpen] = useState(false);

  return (
    <section
      className="relative overflow-hidden border-b-4 border-[#46A302] bg-gradient-to-b from-[#58CC02] via-[#89E219] to-[#D7FFB8] text-slate-900"
      aria-labelledby="persona-gallery-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: "url(/images/personas/section-pattern.svg)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-[1920px] px-4 py-10 md:px-8 md:py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 bg-white/90 px-4 py-1.5 font-bold text-[#1899D6] text-xs shadow-sm">
              <Sparkles className="size-3.5" aria-hidden />
              KIT Vibe-Coding · Persona Gallery
            </p>
            <h2
              id="persona-gallery-heading"
              className="mt-4 font-extrabold text-3xl leading-tight tracking-tight text-[#3C3C3C] md:text-4xl"
            >
              Select Your Mentor
            </h2>
            <p className="mt-2 max-w-xl text-pretty font-semibold text-[#4B4B4B] text-lg leading-snug md:text-xl">
              오늘의 학습은 어떤 스타일로 할까요? 카드만 눌러도 전체 튜터 톤이 한 번에 맞춰져요.
            </p>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-[#526856] md:text-base">
              멘토를 고르면 <strong className="text-[#135223]">currentPersona</strong>가 갱신되고,
              증류·아바타 파이프라인이 같은 목소리로 정렬됩니다. 실패 없이 다시 도전해도 괜찮아요 — 당신
              페이스가 우선이에요.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setFinOpsOpen(true)}
            className="h-12 shrink-0 rounded-2xl border-2 border-[#1899D6] bg-white px-5 font-bold text-[#1899D6] shadow-[0_4px_0_0_#1899D6] hover:bg-sky-50 active:translate-y-[3px] active:shadow-none"
          >
            <BarChart3 className="size-4" aria-hidden />
            Token Savings
          </Button>
        </div>

        <TokenSavingsReport open={finOpsOpen} onOpenChange={setFinOpsOpen} />

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {CARDS.map((c, idx) => {
            const selected = selectedPersonaId === c.id;
            return (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 22, delay: idx * 0.05 }}
                className="list-none"
              >
                <motion.button
                  type="button"
                  layout
                  onClick={() => setSelectedPersonaId(c.id)}
                  whileTap={{
                    scale: 0.93,
                    y: 4,
                    transition: { type: "spring", stiffness: 700, damping: 22 },
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={cn(
                    "group relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border-4 p-4 text-left transition-colors",
                    c.cardBg,
                    c.border,
                    c.shadow,
                    selected && "ring-4 ring-[#FFC800] ring-offset-2 ring-offset-[#D7FFB8]",
                  )}
                >
                  <div className="mb-3 flex h-[100px] min-h-[100px] items-center justify-center rounded-2xl bg-white/80">
                    <PersonaMentorImage
                      personaId={c.id}
                      priority={idx < 4}
                      className="drop-shadow-sm"
                    />
                  </div>
                  <h3 className="font-extrabold text-[#3C3C3C] text-lg leading-tight tracking-tight">
                    {c.title}
                  </h3>
                  <p className="mt-1 font-bold text-[#1899D6] text-xs uppercase tracking-wide">
                    {personaLabelKo(c.id)}
                  </p>
                  <p className="mt-2 flex-1 text-pretty font-medium text-[#4B4B4B] text-sm leading-snug">
                    {c.blurb}
                  </p>
                  {selected ? (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#58CC02] px-3 py-1 font-bold text-white text-xs shadow-inner">
                      <Sparkles className="size-3.5" aria-hidden />
                      선택됨!
                    </div>
                  ) : (
                    <span className="mt-3 font-bold text-[#526856] text-xs opacity-80 transition-opacity group-hover:opacity-100">
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
