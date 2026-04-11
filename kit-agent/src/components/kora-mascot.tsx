"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/** 마스코트 '코라' — `public/images/image_12.png` 배치 시 표시 */
export function KoraMascot() {
  return (
    <motion.div
      className="pointer-events-none fixed bottom-4 right-4 z-30 w-[min(168px,38vw)] md:bottom-6 md:right-6 md:w-[min(200px,32vw)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.2 }}
      aria-hidden
    >
      <div className="pointer-events-auto relative rounded-2xl border border-slate-100 bg-white p-2 shadow-md">
        <div className="relative mx-auto aspect-square w-full max-w-[160px]">
          <Image
            src="/images/image_12.png"
            alt="코라 — KIT AI 튜터"
            fill
            sizes="200px"
            className="object-contain object-bottom drop-shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
            priority={false}
          />
        </div>
        <p className="mt-1 text-center font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-700">
          Kora
        </p>
        <p className="text-center font-sans text-[10px] text-slate-600">실시간 학습 동행</p>
      </div>
    </motion.div>
  );
}
