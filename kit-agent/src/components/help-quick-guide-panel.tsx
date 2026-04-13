"use client";

import { cn } from "@/lib/utils";

const shortcutItems = [
  { key: "Space", desc: "누르고 말하기(PTT) - 브라우저가 단축키를 허용한 경우" },
  { key: "Enter", desc: "질문 전송" },
  { key: "Shift + Enter", desc: "줄바꿈 입력" },
  { key: "Esc", desc: "모달/패널 닫기" },
];

export function HelpQuickGuidePanel() {
  return (
    <section className="mt-5 space-y-4 rounded-2xl border-2 border-gray-100 bg-white px-4 py-4">
      <header>
        <p className="font-headline text-sm font-bold text-pw-on-surface">Help & Quick Guide</p>
        <p className="mt-1 text-xs text-slate-600">
          마이크 권한, 멀티 에이전트 활용, 학습 단축 동작을 빠르게 확인하세요.
        </p>
      </header>

      <article className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3">
        <p className="text-xs font-semibold text-slate-800">마이크 소리가 들리지 않나요?</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-700">
          <li>주소창 왼쪽 자물쇠 아이콘 클릭 → 사이트 설정 열기</li>
          <li>
            <span className="font-semibold">마이크 권한</span>을{" "}
            <span className="font-semibold text-emerald-700">허용</span>으로 변경
          </li>
          <li>운영체제 사운드 설정에서 기본 입력 장치가 올바른지 확인</li>
          <li>다른 앱(회의·녹음 프로그램)의 마이크 점유를 해제</li>
          <li>페이지 새로고침 후 다시 학습 시작</li>
        </ol>
      </article>

      <article className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3">
        <p className="text-xs font-semibold text-slate-800">에이전트 활용 가이드</p>
        <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-700">
          <li>
            <span className="font-semibold text-slate-900">CFO 에이전트</span>: ECO/HIGH 흐름과
            토큰·세션 비용을 추적해 불필요한 호출을 줄입니다. 반복 실험 전 ECO로 시작하면 비용
            절감 효과가 큽니다.
          </li>
          <li>
            <span className="font-semibold text-slate-900">비유의 마술사</span>: 어려운 개념을
            학습자 관점 비유로 재구성합니다. 추상 개념이 막힐 때 동일 질문을 비유 중심으로 다시
            요청하세요.
          </li>
          <li>
            <span className="font-semibold text-slate-900">Consensus/검증 에이전트</span>:
            핵심 결론이 여러 모델에서 일치하는지 교차 확인합니다. 제출 전 사실 검증 단계에 특히
            유용합니다.
          </li>
        </ul>
      </article>

      <article className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-3">
        <p className="text-xs font-semibold text-slate-800">추천 단축키</p>
        <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
          {shortcutItems.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <kbd
                className={cn(
                  "rounded-md border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-800",
                )}
              >
                {item.key}
              </kbd>
              <span>{item.desc}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
