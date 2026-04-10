import {
  TUTOR_SYSTEM,
  buildTutorUserPayload,
  parseQuizJson,
} from "@/lib/agent/prompts/tutor";
import { completeTextTracked } from "@/lib/agent/llm";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import type { AgentState } from "@/lib/agent/state";
import { QUALITY_PASS_THRESHOLD } from "@/lib/agent/constants";

export async function tutorNode(state: AgentState) {
  const user = buildTutorUserPayload(state.structuredSummary);
  const { text: raw, usage } = await completeTextTracked(TUTOR_SYSTEM, user, {
    jsonMode: true,
    tier: state.activeModelTier,
  });
  let finalQuiz;
  let quizParseErr: string | null = null;
  try {
    finalQuiz = parseQuizJson(raw);
  } catch {
    quizParseErr = "Tutor quiz JSON parse failed — empty quiz returned.";
    finalQuiz = {
      title: "복습 퀴즈 (파싱 오류)",
      questions: [],
    };
  }

  const score = state.qualityScore ?? 0;
  const forced = score < QUALITY_PASS_THRESHOLD;
  const entries = [];
  if (forced) {
    entries.push({
      at: new Date().toISOString(),
      phase: "tutor" as const,
      message:
        "최대 증류·검증 라운드에 도달하여 임시로 튜터 단계를 진행합니다. 필요 시 원자료를 보강하세요.",
      metadata: { forced: true, lastScore: score },
    });
  }
  entries.push({
    at: new Date().toISOString(),
    phase: "tutor" as const,
    message: `튜터: 퀴즈 ${finalQuiz.questions.length}문항 생성 완료.`,
    metadata: { title: finalQuiz.title },
  });

  return {
    finalQuiz,
    lastLlmUsage: usage,
    feedbackLog: entries,
    interAgentMessages: [
      handoff({
        from: "Tutor_Agent",
        to: "CFO_Agent",
        taskDone: `Quiz JSON ready — ${finalQuiz.questions.length} Qs.`,
        keyFindings: forced ? "Forced path (low prior score)." : "Normal pass path.",
        nextAction: "CFO: book tutor tokens → close session.",
        errors: quizParseErr,
        terminalLine: `Tutor_Agent: Built ${finalQuiz.questions.length} review question(s).`,
        structured: { questionCount: finalQuiz.questions.length, forced },
      }),
    ],
  };
}
