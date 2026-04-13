"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MaterialSymbol } from "@/components/material-symbol";

type QuizItem = {
  id: string;
  prompt: string;
  choices: string[];
  hint: string;
};

const MOCK_ITEMS: QuizItem[] = [
  {
    id: "q1",
    prompt: "다음 중 '관심 분리(Separation of Concerns)'에 가장 가까운 설명은?",
    choices: [
      "한 파일에 모든 로직을 모은다",
      "UI·도메인·데이터 접근을 역할별로 나눈다",
      "변수 이름을 짧게 쓴다",
    ],
    hint: "워크숍 미학: 한 겹씩 벗겨내며 읽히는 구조를 생각해 보세요.",
  },
  {
    id: "q2",
    prompt: "Vision Agent가 다이어그램에서 먼저 고정하는 정보는 무엇일까요?",
    choices: ["픽셀 노이즈 분포", "노드·엣지 관계", "폰트 크기"],
    hint: "그래프의 의미는 연결에서 나옵니다.",
  },
];

type WorkshopInteractiveQuizMockProps = {
  accentHex: string;
  onBack: () => void;
};

export function WorkshopInteractiveQuizMock({
  accentHex,
  onBack,
}: WorkshopInteractiveQuizMockProps) {
  const [selection, setSelection] = useState<Record<string, number>>({});

  return (
    <motion.section
      layout
      className="chat-bubble-surface mx-auto w-full max-w-[min(36rem,85vw)] space-y-5 rounded-3xl border-b-4 border-pw-surface-container bg-white p-4 shadow-sm min-[400px]:space-y-6 min-[400px]:p-6 sm:max-w-3xl sm:p-8"
      style={{ borderBottomColor: `${accentHex}55` }}
      aria-label="인터랙티브 퀴즈 미리보기"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Interactive Quiz · Mock
          </p>
          <h2 className="font-headline mt-1 text-2xl font-extrabold tracking-tight text-pw-on-surface">
            방금 분석한 흐름을 바탕으로 한 드릴
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            실제 대회 파이프라인에 맞춘 카드 레이아웃입니다. 선택은 로컬에서만 유지됩니다.
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ y: 2, scale: 0.98 }}
          onClick={onBack}
          className="tactile-button rounded-2xl border-2 border-b-4 border-gray-200 border-b-gray-300 bg-pw-surface-container-low px-4 py-2 text-sm font-bold text-pw-on-surface shadow-sm"
        >
          워크스페이스로
        </motion.button>
      </div>

      <div className="space-y-5">
        {MOCK_ITEMS.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, type: "spring", stiffness: 320, damping: 24 }}
            className="mx-auto w-full max-w-[min(100%,85vw)] rounded-2xl border-2 border-gray-100 bg-pw-surface-container-low/60 p-4 shadow-[0_3px_0_0_rgb(229_231_235)] min-[400px]:p-5 sm:mx-0 sm:max-w-none"
          >
            <p className="font-headline text-sm font-bold text-pw-on-surface">
              {idx + 1}. {item.prompt}
            </p>
            <p className="mt-2 text-xs text-slate-500">{item.hint}</p>
            <div className="mt-4 flex flex-col gap-2">
              {item.choices.map((c, i) => {
                const on = selection[item.id] === i;
                return (
                  <motion.button
                    key={c}
                    type="button"
                    layout
                    whileTap={{ y: 2, scale: 0.995 }}
                    onClick={() => setSelection((s) => ({ ...s, [item.id]: i }))}
                    className={cn(
                      "persona-card-tactile flex w-full items-center gap-3 rounded-xl border-2 border-b-4 px-3 py-3 text-left text-sm font-semibold transition-colors",
                      on
                        ? "border-[color:var(--pw-persona-accent,#10b981)] border-b-[color:var(--pw-persona-accent,#10b981)] bg-white shadow-sm"
                        : "border-gray-200 border-b-gray-300 bg-white hover:border-gray-300",
                    )}
                    style={on ? { color: accentHex } : undefined}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg border-2 border-gray-200 bg-pw-surface-container-low font-mono text-xs"
                      aria-hidden
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1 text-pw-on-surface">{c}</span>
                    {on ? (
                      <MaterialSymbol name="check_circle" fill className="shrink-0 text-[22px]" />
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
