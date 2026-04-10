"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-slate-100">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">KIT Vibe-Coding</h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed">
            애플리케이션을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          onClick={() => reset()}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
