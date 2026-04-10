"use client";

import { motion } from "framer-motion";

export function SummaryStreamSkeleton() {
  return (
    <div className="space-y-3 p-1" aria-hidden>
      {[0.92, 0.78, 0.88, 0.64, 0.82].map((w, i) => (
        <motion.div
          key={i}
          className="h-3 rounded-md bg-gradient-to-r from-zinc-700/40 via-zinc-500/35 to-zinc-700/40"
          style={{ width: `${w * 100}%` }}
          animate={{ opacity: [0.45, 0.85, 0.45] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
      <div className="flex gap-2 pt-2">
        <motion.div
          className="h-16 flex-1 rounded-lg bg-zinc-800/50"
          animate={{ opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-16 flex-1 rounded-lg bg-zinc-800/40"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}
