import { Loader2 } from "lucide-react";

/** 전역·세그먼트 로딩 UI — 트래픽 급증 시에도 “동작 중” 피드백을 명확히 합니다. */
export function PageLoading({ label = "로딩 중…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="text-primary size-10 animate-spin" aria-hidden />
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
    </div>
  );
}
