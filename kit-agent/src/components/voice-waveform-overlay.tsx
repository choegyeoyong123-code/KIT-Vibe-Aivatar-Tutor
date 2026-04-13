"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** `btn-train-voice` 등에 겹쳐 쓰는 분석/합성 중 파형 애니메이션 */
export function VoiceWaveformOverlay({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  if (!active) return null;
  const bars = [0.35, 0.55, 0.85, 1, 0.75, 0.5, 0.3, 0.55, 0.8, 0.95, 0.6, 0.4];
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center gap-0.5 rounded-[inherit] bg-white/75 backdrop-blur-[2px]",
        className,
      )}
      aria-hidden
    >
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full bg-emerald-500/90"
          initial={{ height: 4 }}
          animate={{
            height: [6, 4 + h * 18, 6, 4 + h * 14, 6],
            opacity: [0.55, 1, 0.65, 1, 0.55],
          }}
          transition={{
            duration: 1.05 + i * 0.04,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
          style={{ minHeight: 4 }}
        />
      ))}
    </div>
  );
}
