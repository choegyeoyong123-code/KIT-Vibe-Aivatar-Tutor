"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          일시적인 오류가 발생했습니다
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          멀티모달 파이프라인 또는 네트워크 지연으로 화면을 표시하지 못했습니다. 다시 시도하거나
          잠시 후 새로고침해 주세요.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground mt-3 font-mono text-xs">ref: {error.digest}</p>
        ) : null}
      </div>
      <Button type="button" onClick={() => reset()}>
        다시 시도
      </Button>
    </div>
  );
}
