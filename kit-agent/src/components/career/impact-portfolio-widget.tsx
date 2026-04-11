"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildStarFromSummary, ImpactPortfolioDialog } from "@/components/career/impact-portfolio-dialog";

export function ImpactPortfolioWidget({
  summarizationInstruction,
  summaryMarkdown,
  qualityScore,
  disabled,
}: {
  summarizationInstruction: string;
  summaryMarkdown: string;
  qualityScore: number | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const star = useMemo(
    () =>
      buildStarFromSummary({
        summarizationInstruction,
        summaryMarkdown,
        qualityScore,
      }),
    [summarizationInstruction, summaryMarkdown, qualityScore],
  );

  return (
    <>
      <div className="mt-4 border-t-2 border-dashed border-gray-200 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !summaryMarkdown.trim()}
          className="h-11 w-full rounded-2xl border-2 border-[#1CB0F6]/45 bg-white font-sans text-sm font-semibold text-[#1CB0F6] shadow-[0_4px_0_0_rgba(28,176,246,0.12)] hover:bg-[#1CB0F6]/[0.06] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="mr-2 size-4 text-[#58CC02]" aria-hidden />
          이 로직을 포트폴리오에 어떻게 쓸까요?
        </Button>
        <p className="mt-2 text-center font-sans text-[11px] text-[#4B4B4B]/60">
          STAR(Situation–Task–Action–Result) 면접 답변 초안으로 변환합니다.
        </p>
      </div>
      <ImpactPortfolioDialog open={open} onOpenChange={setOpen} star={star} />
    </>
  );
}
