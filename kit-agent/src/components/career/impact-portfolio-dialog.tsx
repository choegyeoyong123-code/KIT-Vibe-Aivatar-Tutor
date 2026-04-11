"use client";

import { Briefcase } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type StarBlock = {
  situation: string;
  task: string;
  action: string;
  result: string;
};

function extractCodeExcerpt(markdown: string): string {
  const m = markdown.match(/```(?:[\w-]*)?\n([\s\S]*?)```/);
  if (m?.[1]) return m[1].trim().slice(0, 520);
  return markdown.replace(/\s+/g, " ").trim().slice(0, 420);
}

export function buildStarFromSummary(args: {
  summarizationInstruction: string;
  summaryMarkdown: string;
  qualityScore: number | null;
}): StarBlock {
  const instr = args.summarizationInstruction.trim().slice(0, 160);
  const code = extractCodeExcerpt(args.summaryMarkdown);
  const q = args.qualityScore != null && Number.isFinite(args.qualityScore) ? args.qualityScore : null;

  return {
    situation:
      instr.length > 0
        ? `코리아 IT 아카데미 KIT Vibe-Coding 세션에서, '${instr}' 요구에 맞춰 자료를 업로드하고 학습 노트를 정리한 상황입니다.`
        : `KIT 학습 콘솔에서 멀티 에이전트 파이프라인으로 자료를 증류·요약하며 포트폴리오용 산출물을 준비한 상황입니다.`,
    task: `기술 면접에서 말로 설명할 수 있도록 핵심 로직과 근거를 STAR 형식으로 재구성하고, 제품·보안·비용 관점의 키워드를 드러내기.`,
    action: `에이전트가 생성한 요약·노트를 바탕으로 아래 내용을 중심으로 사고 과정을 정리했습니다.\n\n${code}${code.length >= 420 ? "…" : ""}`,
    result: `정리된 산출물은 품질 점수 ${q != null ? `${q}/10` : "(세션 검증)"} 기준으로 복기 가능하며, 포트폴리오·이력서의 '프로젝트 설명'과 기술 면접 답변으로 바로 전환할 수 있습니다.`,
  };
}

function StarSection({ title, k, body }: { title: string; k: string; body: string }) {
  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] p-3">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-[#1CB0F6]">
        {k} · {title}
      </p>
      <p className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#4B4B4B]">
        {body}
      </p>
    </div>
  );
}

export function ImpactPortfolioDialog({
  open,
  onOpenChange,
  star,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  star: StarBlock;
  className?: string;
}) {
  const title = useMemo(() => "기술 면접용 STAR 답변", []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl border-2 border-[#1CB0F6]/35 bg-white",
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-sans text-lg text-[#4B4B4B]">
            <Briefcase className="size-5 text-[#1CB0F6]" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription className="font-sans text-left text-[#4B4B4B]/80">
            이번 세션 로직을 포트폴리오·면접 스토리로 옮길 때 사용할 수 있는 초안입니다. 수치·코드는 실제 본인
            기여에 맞게 수정하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-3">
          <StarSection title="상황" k="S" body={star.situation} />
          <StarSection title="과제" k="T" body={star.task} />
          <StarSection title="행동" k="A" body={star.action} />
          <StarSection title="결과" k="R" body={star.result} />
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="cyanTactile"
            className="rounded-2xl"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
