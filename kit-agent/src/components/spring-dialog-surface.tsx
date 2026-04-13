"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SpringDialogSurfaceProps = {
  children: React.ReactNode;
  className?: string;
};

/** 모달 본문 — stiffness 300 / damping 20 스프링 진입 */
export function SpringDialogSurface({ children, className }: SpringDialogSurfaceProps) {
  return (
    <motion.div
      className={cn("flex flex-col gap-4", className)}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
