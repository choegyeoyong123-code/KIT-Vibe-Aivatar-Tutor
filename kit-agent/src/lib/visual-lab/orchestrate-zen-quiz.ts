import type { LogicGraphJson, ZenQuizPack } from "@/lib/visual-lab/logic-graph-schema";
import { generateQuizzesFromLogicGraph } from "@/lib/visual-lab/generate-quizzes-from-logic";
import {
  runQuizAgentDebate,
  type QuizDebateResult,
} from "@/lib/visual-lab/quiz-agent-debate";

export type ZenQuizOrchestrationOk = {
  ok: true;
  pack: ZenQuizPack;
  debate: QuizDebateResult;
  attempts: number;
  demo: boolean;
};

export type ZenQuizOrchestrationFail = {
  ok: false;
  reason: string;
  lastDebate: QuizDebateResult | null;
  attempts: number;
};

export type ZenQuizOrchestrationResult =
  | ZenQuizOrchestrationOk
  | ZenQuizOrchestrationFail;

const MAX_REGEN = 2;

/**
 * 퀴즈 생성 → 멀티 에이전트 토론 → 불가 시 재생성 루프.
 */
export async function orchestrateZenQuizPipeline(input: {
  logic: LogicGraphJson;
  personaAnalogySeed?: string;
}): Promise<ZenQuizOrchestrationResult> {
  const repairNotes: string[] = [];
  let lastDebate: QuizDebateResult | null = null;
  let demo = false;

  for (let attempt = 0; attempt <= MAX_REGEN; attempt++) {
    const { pack, demo: genDemo, modelId } = await generateQuizzesFromLogicGraph({
      logic: input.logic,
      personaAnalogySeed: input.personaAnalogySeed,
      repairNotes: repairNotes.length ? repairNotes : undefined,
    });
    if (genDemo || modelId === "mock") demo = true;

    const debate = await runQuizAgentDebate({ logic: input.logic, pack });
    lastDebate = debate;
    if (debate.bothApprove) {
      return {
        ok: true,
        pack,
        debate,
        attempts: attempt + 1,
        demo: demo || debate.demo,
      };
    }

    repairNotes.push(
      ...debate.critic.notes.map((n) => `[Critic] ${n}`),
      ...debate.educator.notes.map((n) => `[Educator] ${n}`),
    );
  }

  return {
    ok: false,
    reason:
      "두 에이전트가 연속으로 승인하지 않아 퀴즈를 확정하지 못했습니다. 로직 JSON을 보강하거나 이미지 품질을 올려 다시 시도해 주세요.",
    lastDebate,
    attempts: MAX_REGEN + 1,
  };
}
