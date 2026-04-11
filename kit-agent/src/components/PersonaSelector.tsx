"use client";

import { EDUCATIONAL_PERSONAS } from "@/constants/personas";
import { glassPanelClass } from "@/lib/glass-styles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEducationalPersona } from "@/components/educational-persona-context";

/**
 * 첫 방문 시 교육 철학 페르소나 선택 — White & Tactile / 글래스 톤 유지.
 */
export function PersonaSelector() {
  const {
    hydrated,
    onboardingComplete,
    selectedPersona,
    selectPersona,
    completeOnboarding,
  } = useEducationalPersona();

  if (!hydrated || onboardingComplete) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edu-persona-title"
    >
      <div
        className={cn(
          glassPanelClass({ rounded: "3xl", hover: false }),
          "max-h-[min(92vh,880px)] w-full max-w-3xl overflow-y-auto border-2 border-gray-100 bg-white/95 p-6 shadow-none",
        )}
      >
        <h2
          id="edu-persona-title"
          className="text-center text-xl font-semibold tracking-tight text-[#4B4B4B] sm:text-2xl"
        >
          학습에 맞는 튜터 철학을 고르세요
        </h2>
        <p className="mt-2 text-center text-sm text-[#4B4B4B]/75">
          선택에 따라 설명 밀도·비유·실전 톤이 달라집니다. 캐릭터 이미지는 사용하지 않습니다.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {EDUCATIONAL_PERSONAS.map((p, index) => {
            const selected = selectedPersona?.id === p.id;
            const ringCyan = index % 2 === 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPersona(p.id)}
                className={cn(
                  "flex min-h-[120px] flex-col rounded-2xl border-2 border-gray-100 bg-white p-4 text-left transition-[transform,border-color,box-shadow] duration-150",
                  "border-b-4 border-b-gray-200/90 active:translate-y-1 active:border-b-2",
                  selected &&
                    (ringCyan
                      ? "border-cyan-300 ring-2 ring-cyan-500 ring-offset-2 ring-offset-white"
                      : "border-emerald-300 ring-2 ring-emerald-500 ring-offset-2 ring-offset-white"),
                )}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl" aria-hidden>
                    {p.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#4B4B4B]">
                      {p.name}
                    </div>
                    <div className="text-xs font-medium text-[#4B4B4B]/55">
                      {p.level}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          <div
            className="hidden min-h-[120px] rounded-2xl border-2 border-dashed border-gray-100 bg-white/50 sm:block"
            aria-hidden
          />
        </div>

        <div
          className={cn(
            glassPanelClass({ rounded: "2xl", hover: false }),
            "mt-5 min-h-[4.5rem] border-2 border-gray-100 bg-white/90 p-4",
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[#4B4B4B]/50">
            선택한 튜터 설명
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[#4B4B4B]">
            {selectedPersona?.shortDescription ??
              "카드를 눌러 튜터를 선택하면 이곳에 한 줄 설명이 표시됩니다."}
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="chunky"
            size="lg"
            className="min-w-[240px] px-8 py-6 text-base"
            disabled={!selectedPersona}
            onClick={completeOnboarding}
          >
            튜터와 학습 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
