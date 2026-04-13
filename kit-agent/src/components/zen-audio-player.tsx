"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { beginPlaybackCleanupCountdown } from "@/lib/client/data-volatility-meter";

type ZenAudioPlayerProps = {
  src: string | null;
  /** 페르소나 액센트 등 — glow 색 */
  glowColor?: string;
  className?: string;
  /** 재생 종료 후 자동 정리까지 초(휘발성 미터·콜백) */
  volatileCleanupSec?: number;
  onVolatileCleanup?: () => void;
  /** 재생이 실제로 시작될 때(골든 패스 등) */
  onPlayBegin?: () => void;
};

export function ZenAudioPlayer({
  src,
  glowColor = "#059669",
  className,
  volatileCleanupSec,
  onVolatileCleanup,
  onPlayBegin,
}: ZenAudioPlayerProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    el.src = src;
    el.load();
    setPlaying(false);
    setProgress(0);
  }, [src]);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el || !src) return;
    if (playing) {
      void el.pause();
      setPlaying(false);
    } else {
      void el
        .play()
        .then(() => {
          setPlaying(true);
          onPlayBegin?.();
        })
        .catch(() => setPlaying(false));
    }
  }, [playing, src, onPlayBegin]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => {
      if (!el.duration) setProgress(0);
      else setProgress((el.currentTime / el.duration) * 100);
    };
    const onEnded = () => {
      setPlaying(false);
      if (
        volatileCleanupSec &&
        volatileCleanupSec > 0 &&
        typeof onVolatileCleanup === "function"
      ) {
        beginPlaybackCleanupCountdown(volatileCleanupSec, onVolatileCleanup);
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, [src, volatileCleanupSec, onVolatileCleanup]);

  if (!src) return null;

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-white/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner",
        className,
      )}
      style={{
        boxShadow: `0 0 0 1px ${glowColor}33, 0 8px 28px -6px ${glowColor}55`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${glowColor}, transparent 70%)`,
        }}
      />
      <audio ref={ref} className="hidden" preload="metadata" />
      <div className="relative flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-12 shrink-0 rounded-full border-2 shadow-sm"
          style={{ borderColor: `${glowColor}55`, color: glowColor }}
          onClick={() => void toggle()}
          aria-label={playing ? "일시정지" : "재생"}
        >
          {playing ? <Pause className="size-5" /> : <Play className="size-5 pl-0.5" />}
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Zen Audio Player
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: glowColor }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
