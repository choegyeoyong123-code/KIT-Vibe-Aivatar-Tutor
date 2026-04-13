"use client";

import { cn } from "@/lib/utils";

const STUDIO_ASYNC_LAYMAN_COPY =
  "마치 푸드코트의 번호표처럼, AI에게 작업을 맡긴 뒤 번호표(ID)를 드렸어요! 화면을 끄지 마시고 잠시만 기다려주시면 결과가 완성되는 즉시 알려드릴게요.";

/** 비동기 작업(202·jobId 폴링 등) 대기 중 사용자에게 부담 없이 설명하는 보조 문구 */
export function StudioAsyncLaymanHint({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-xl bg-slate-50 px-2.5 py-1.5 font-sans text-[10px] font-normal leading-snug text-slate-400 sm:px-3 sm:py-2 sm:text-[11px]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {STUDIO_ASYNC_LAYMAN_COPY}
    </p>
  );
}
