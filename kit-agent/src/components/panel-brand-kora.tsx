"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** KIT Vibe-Coding · 코라 마스코트 — 패널 헤더 브랜딩 (아주 작게) */
export function PanelBrandKora({
  className,
  size = 28,
}: {
  className?: string;
  /** 표시 크기(px) */
  size?: number;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-lg border border-[#F1F5F9] bg-white shadow-sm ring-1 ring-cyan-500/15",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/kora-brand-mascot.png"
        alt=""
        width={size * 2}
        height={size * 2}
        className="size-full object-cover object-top"
        sizes={`${size}px`}
        priority={false}
      />
    </span>
  );
}
