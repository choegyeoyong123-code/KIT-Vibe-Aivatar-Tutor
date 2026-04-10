"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Shirt, Glasses, Mic2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "베이스 메시 정렬", icon: Sparkles, weight: 18 },
  { label: "의상·액세서리 합성", icon: Shirt, weight: 32 },
  { label: "표정·립싱크 동기화", icon: Mic2, weight: 28 },
  { label: "라이팅·렌더 큐", icon: Glasses, weight: 22 },
] as const;

export function CharacterDressingOverlay({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1000), 120);
    return () => window.clearInterval(id);
  }, [active]);

  const wave = (tick % 100) / 100;
  const stagedProgress = Math.min(
    97,
    STAGES.reduce((acc, s, i) => {
      const wavePhase = (wave + i * 0.22) % 1;
      return acc + s.weight * (0.35 + 0.65 * wavePhase);
    }, 0),
  );

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="dressing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className={cn(
            "pointer-events-none absolute inset-0 z-10 flex flex-col justify-end rounded-xl",
            "bg-gradient-to-t from-[oklch(0.14_0.04_264/0.92)] via-[oklch(0.12_0.03_264/0.55)] to-transparent",
            className,
          )}
          aria-hidden
        >
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-cyan-200/95">
              <Sparkles className="size-4 text-fuchsia-400" />
              Video Synthesis Orchestrator — 캐릭터 드레싱
            </div>
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              {[0, 1, 2].map((ring) => (
                <motion.div
                  key={ring}
                  className="absolute rounded-full border border-cyan-400/35 bg-cyan-500/5"
                  style={{
                    width: 72 + ring * 22,
                    height: 72 + ring * 22,
                  }}
                  animate={{
                    scale: [1, 1.04 + ring * 0.02, 1],
                    opacity: [0.35, 0.7, 0.35],
                  }}
                  transition={{
                    duration: 2.4 + ring * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: ring * 0.15,
                  }}
                />
              ))}
              <motion.div
                className="relative z-[1] flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/25 shadow-[0_0_24px_-4px_oklch(0.72_0.14_195/0.55)]"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Shirt className="size-8 text-cyan-100/90" />
              </motion.div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>파이프라인 진행</span>
                <span className="font-mono text-cyan-300/90">{Math.round(stagedProgress)}%</span>
              </div>
              <Progress
                value={stagedProgress}
                className="h-1.5 bg-zinc-800/90 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:via-cyan-400 [&>div]:to-emerald-400"
              />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                const on = stagedProgress > i * 22;
                return (
                  <motion.li
                    key={s.label}
                    initial={false}
                    animate={{
                      opacity: on ? 1 : 0.45,
                      x: on ? 0 : 4,
                    }}
                    className="flex items-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-950/50 px-2 py-1.5 text-[10px] text-zinc-200"
                  >
                    <Icon className="size-3.5 shrink-0 text-fuchsia-300/90" />
                    <span className="leading-tight">{s.label}</span>
                    <Progress
                      value={on ? 40 + ((tick + i * 17) % 55) : 12}
                      className="ml-auto h-1 w-16 bg-zinc-800 [&>div]:bg-cyan-500/80"
                    />
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
