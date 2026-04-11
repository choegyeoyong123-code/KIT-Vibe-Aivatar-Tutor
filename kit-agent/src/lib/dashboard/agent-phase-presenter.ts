import type { FeedbackPhase } from "@/lib/agent/types";

export type PhasePresentation = {
  /** 짧은 한글 라벨 (교육용) */
  labelKo: string;
  /** 에이전트 역할명 */
  agentRole: string;
  /** Tailwind gradient / border hints */
  accent: string;
  /** 예시 CoT 한 줄 (로딩 스켈레톤 문구에 사용) */
  thinkingHint: string;
};

const DEFAULT: PhasePresentation = {
  labelKo: "협업",
  agentRole: "Orchestrator",
  accent: "from-slate-100 to-slate-50",
  thinkingHint: "에이전트가 상태를 동기화하고 있습니다…",
};

export const PHASE_PRESENT: Record<FeedbackPhase, PhasePresentation> = {
  input: {
    labelKo: "입력",
    agentRole: "Input_Node",
    accent: "from-sky-100 to-blue-50",
    thinkingHint: "학습 자료와 지시를 정규화하는 중입니다…",
  },
  distill: {
    labelKo: "증류",
    agentRole: "Knowledge_Distiller",
    accent: "from-violet-100 to-fuchsia-50",
    thinkingHint: "Knowledge_Distiller가 핵심 개념을 추출하는 중입니다…",
  },
  validate: {
    labelKo: "검증",
    agentRole: "Validator_Agent",
    accent: "from-amber-100 to-orange-50",
    thinkingHint: "Validator가 근거·형식을 교차 검증하는 중입니다…",
  },
  tutor: {
    labelKo: "튜터",
    agentRole: "Tutor_Agent",
    accent: "from-cyan-100 to-teal-50",
    thinkingHint: "튜터 페르소나에 맞춰 설명을 다듬는 중입니다…",
  },
  cfo: {
    labelKo: "비용",
    agentRole: "CFO_Agent",
    accent: "from-emerald-100 to-green-50",
    thinkingHint: "CFO 에이전트가 예산·토큰 효율을 확인하는 중입니다…",
  },
  admin: {
    labelKo: "운영",
    agentRole: "Admin_Agent",
    accent: "from-rose-100 to-red-50",
    thinkingHint: "거버넌스·한도 알림을 평가하는 중입니다…",
  },
  hitl: {
    labelKo: "검토",
    agentRole: "Human_Approval",
    accent: "from-orange-100 to-amber-50",
    thinkingHint: "사람 승인 게이트로 전환되었습니다…",
  },
  exit: {
    labelKo: "종료",
    agentRole: "Exit_Processor",
    accent: "from-zinc-100 to-neutral-50",
    thinkingHint: "세션 종료 전략을 정리하는 중입니다…",
  },
  align: {
    labelKo: "정렬",
    agentRole: "CrossModal_Align",
    accent: "from-indigo-100 to-purple-50",
    thinkingHint: "영상·PDF 정렬 맵을 갱신하는 중입니다…",
  },
  policy: {
    labelKo: "정책",
    agentRole: "Policy_Learner",
    accent: "from-yellow-100 to-amber-50",
    thinkingHint: "과거 유사 시나리오 정책을 조회하는 중입니다…",
  },
  consensus: {
    labelKo: "합의",
    agentRole: "Consensus_Auditor",
    accent: "from-teal-100 to-cyan-50",
    thinkingHint: "합의·감사 노트를 수렴하는 중입니다…",
  },
  vision: {
    labelKo: "비전",
    agentRole: "Vision_Lab",
    accent: "from-pink-100 to-rose-50",
    thinkingHint: "멀티모달 비전 분석을 진행하는 중입니다…",
  },
  creative: {
    labelKo: "창작",
    agentRole: "Creative_Agent",
    accent: "from-fuchsia-100 to-purple-50",
    thinkingHint: "크리에이티브 변형을 생성하는 중입니다…",
  },
  problem: {
    labelKo: "문제",
    agentRole: "Problem_Solver",
    accent: "from-red-100 to-orange-50",
    thinkingHint: "문제 풀이 경로를 탐색하는 중입니다…",
  },
  protocol: {
    labelKo: "프로토콜",
    agentRole: "Message-in-State",
    accent: "from-emerald-100 to-cyan-50",
    thinkingHint: "에이전트 간 핸드오프 메시지를 기록하는 중입니다…",
  },
};

export function presentPhase(phase: FeedbackPhase): PhasePresentation {
  return PHASE_PRESENT[phase] ?? DEFAULT;
}
