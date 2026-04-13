import type { FinalQuiz } from "@/lib/agent/types";

/** 헤더 Visual Lab 데모 — 채팅 영역에 삽입되는 경량 퀴즈 */
export const MOCK_HEADER_STUDIO_QUIZ: FinalQuiz = {
  title: "Interactive Quiz · Vision Agent (데모)",
  questions: [
    {
      id: "hq-1",
      prompt: "다이어그램에서 에이전트 오케스트레이션의 첫 단계로 가장 적절한 것은?",
      choices: ["컨텍스트 수집", "즉시 최종 요약 출력", "비용 무시 확장", "사용자 로그아웃"],
      correctAnswer: "컨텍스트 수집",
      explanation: "멀티 에이전트 파이프라인은 입력·정책·안전 게이트를 거친 뒤 본 추론으로 이어집니다.",
    },
  ],
};

export const VISUAL_LAB_MOCK_STEPS = [
  "Vision Agent parsing diagram…",
  "Layout Agent stabilizing regions…",
  "Quiz Agent assembling interactions…",
] as const;

export const MEDIA_STUDIO_MOCK_STEPS = [
  "Media Agent transcribing timeline…",
  "Audio Director shaping persona bed…",
  "Mux Agent preparing preview surface…",
] as const;
