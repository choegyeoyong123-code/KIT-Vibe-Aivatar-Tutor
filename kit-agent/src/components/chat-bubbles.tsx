import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 사용자 메시지 */
export function UserChatBubble({
  children,
  className,
  label = "요청",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("flex min-w-0 justify-end", className)}>
      <div className="min-w-0 max-w-[min(100%,42rem)]">
        <p className="mb-2 text-right font-sans text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/50">
          {label}
        </p>
        <div className="overflow-hidden rounded-2xl border-2 border-gray-100 bg-white px-5 py-4 text-sm leading-relaxed text-[#4B4B4B] break-words">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * AI 답변 — 캐릭터 없이 넓은 여백, 옅은 회색 카드 (#F9FAFB)
 */
export function TutorReplyShell({
  children,
  className,
  label = "AI 튜터",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("flex min-w-0 justify-start", className)}>
      <div className="min-w-0 w-full max-w-[min(100%,48rem)]">
        <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-wider text-[#4B4B4B]/50">
          {label}
        </p>
        <div className="min-w-0 overflow-x-auto rounded-2xl border-2 border-gray-100 bg-[#F9FAFB] px-6 py-6 text-[#4B4B4B] break-words">
          {children}
        </div>
      </div>
    </div>
  );
}
