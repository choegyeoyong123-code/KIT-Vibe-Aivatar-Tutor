"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ASYNC_LAYMAN_COPY =
  "똑똑한 AI가 고차원적인 생각을 하는 중이에요. 이 방식 덕분에 기다리는 동안 다른 메뉴를 둘러보셔도 서비스가 멈추지 않아요!";

type AsyncProcessingLaymanTooltipProps = {
  /** 로딩(스피너) 중일 때만 표시 */
  visible: boolean;
  /** 부모 버튼의 `aria-describedby`와 연결할 툴팁 본문 id */
  descriptionId: string;
  className?: string;
};

/**
 * 비동기 처리 중 ? 트리거 + 툴팁(클릭 토글, 포커스 가능).
 */
export function AsyncProcessingLaymanTooltip({
  visible,
  descriptionId,
  className,
}: AsyncProcessingLaymanTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none absolute right-2 top-2 z-[21] sm:right-3 sm:top-3",
        className,
      )}
    >
      <div className="pointer-events-auto relative">
        <button
          type="button"
          className={cn(
            "flex size-7 items-center justify-center rounded-full border border-white/60 bg-white/95 font-headline text-xs font-bold text-slate-600 shadow-md ring-1 ring-slate-200/60 backdrop-blur-sm",
            "motion-safe:animate-pulse motion-reduce:animate-none",
            "transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary",
          )}
          aria-label="비동기 처리 안내 열기"
          aria-expanded={open}
          aria-controls={descriptionId}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          ?
        </button>
        <div
          id={descriptionId}
          role="tooltip"
          aria-hidden={!open}
          className={cn(
            "absolute right-0 top-[calc(100%+0.35rem)] w-[min(17.5rem,calc(100vw-2.5rem))] origin-top-right rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-left text-[11px] font-medium leading-snug text-slate-600 shadow-lg backdrop-blur-md sm:text-xs",
            "transition-[opacity,transform] duration-200 ease-out",
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.98] opacity-0",
          )}
        >
          {ASYNC_LAYMAN_COPY}
        </div>
      </div>
    </div>
  );
}
