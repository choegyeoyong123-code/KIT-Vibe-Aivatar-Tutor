import { generateCreativeEducationalContent } from "@/lib/agent/nodes/creative-educational";
import { completeTextTracked } from "@/lib/agent/llm";
import { usdCostForTokens } from "@/lib/agent/pricing";
import type { VisualProblemState } from "@/lib/agent/visual-problem-state";
import {
  VP_EVAL_SYSTEM,
  VP_QUESTION_SYSTEM,
  VP_TUTOR_SYSTEM,
  buildVpEvalUser,
  buildVpQuestionUser,
  buildVpTutorUser,
} from "@/lib/agent/prompts/visual-problem";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";

function cfoSlice(
  state: VisualProblemState,
  usage: LlmUsageRecord,
  step: string,
) {
  const deltaUsd = usdCostForTokens(
    usage.modelId,
    usage.inputTokens,
    usage.outputTokens,
  );
  const tokens = usage.inputTokens + usage.outputTokens;
  const nextAcc = state.accumulatedCost + deltaUsd;
  return {
    totalTokenUsage: tokens,
    accumulatedCost: deltaUsd,
    estimatedCost: nextAcc + 0.02,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "cfo" as const,
        message: `${step}: +$${deltaUsd.toFixed(4)} USD, +${tokens} 토큰.`,
        metadata: { step, deltaUsd, tokens },
      },
    ],
  };
}

function groundingJson(g: VisualProblemState["visualGrounding"]): string {
  if (!g) return "{}";
  return JSON.stringify(
    {
      detectedObjects: g.detectedObjects,
      ocrText: g.ocrText,
      contextualSummary: g.contextualSummary,
    },
    null,
    0,
  );
}

function parseQuestionJson(raw: string): { question: string; rubric: string } {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const p = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      question: String(p.question ?? "").trim(),
      rubric: String(p.rubric ?? "").trim(),
    };
  } catch {
    return { question: "", rubric: "" };
  }
}

function parseEvalJson(raw: string): { correct: boolean; feedback: string } {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const p = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      correct: Boolean(p.correct),
      feedback: String(p.feedback ?? "").trim(),
    };
  } catch {
    return { correct: false, feedback: "응답을 해석하지 못했습니다. 다시 시도해 주세요." };
  }
}

export async function vpCreativeNode(state: VisualProblemState) {
  const vg = state.visualGrounding;
  const { text, usage } = await generateCreativeEducationalContent({
    contextualSummary: vg?.contextualSummary ?? "",
    visualGrounding: vg,
    intent: state.creativeIntent,
    userGoal: state.userGoal || undefined,
  });
  const cfo = cfoSlice(state, usage, "CFO (크리에이티브)");
  return {
    creativeOutputJson: text,
    totalTokenUsage: cfo.totalTokenUsage,
    accumulatedCost: cfo.accumulatedCost,
    estimatedCost: cfo.estimatedCost,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "vision" as const,
        message: "시각 그라운딩 컨텍스트로 크리에이티브 교육 콘텐츠를 생성했습니다.",
        metadata: { intent: state.creativeIntent },
      },
      {
        at: new Date().toISOString(),
        phase: "creative" as const,
        message: `형식: ${state.creativeIntent} (Claude 3.5 Sonnet 우선).`,
      },
      ...cfo.feedbackLog,
    ],
  };
}

export async function vpGenQuestionNode(state: VisualProblemState) {
  const prior = state.feedbackLog
    .filter((e) => e.phase === "problem" && e.message.includes("문제:"))
    .map((e) => e.message)
    .join("\n");
  const user = buildVpQuestionUser({
    visualGroundingJson: groundingJson(state.visualGrounding),
    creativeSnippet: state.creativeOutputJson.slice(0, 8000),
    priorQuestions: prior,
  });
  const { text: raw, usage } = await completeTextTracked(
    VP_QUESTION_SYSTEM,
    user,
    { jsonMode: true, tier: "standard" },
  );
  const { question, rubric } = parseQuestionJson(raw);
  const q =
    question ||
    "제시된 시각 맥락에서 가장 중요한 객체 하나를 고르고, 왜 교육적으로 의미 있는지 한 문장으로 설명하세요.";
  const r =
    rubric ||
    "맥락 요약과 일치하는 객체 지정 + 교육적 이유(텍스트/유물과 연결).";
  const cfo = cfoSlice(state, usage, "CFO (문제 출제)");
  return {
    currentQuestion: q,
    answerRubric: r,
    problemsPresented: 1,
    hintLevel: 0,
    tutorHint: "",
    lastEvaluationCorrect: null,
    evaluationFeedback: "",
    totalTokenUsage: cfo.totalTokenUsage,
    accumulatedCost: cfo.accumulatedCost,
    estimatedCost: cfo.estimatedCost,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "problem" as const,
        message: `문제: ${q}`,
        metadata: { rubric: r.slice(0, 500) },
      },
      ...cfo.feedbackLog,
    ],
  };
}

export async function vpAwaitAnswerNode(state: VisualProblemState) {
  const a = state.studentAnswer?.trim().slice(0, 800);
  return {
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "problem" as const,
        message: a
          ? `학습자 응답: "${a}"`
          : "(빈 응답 — 평가는 계속됩니다.)",
      },
    ],
  };
}

export async function vpEvaluateNode(state: VisualProblemState) {
  const user = buildVpEvalUser({
    question: state.currentQuestion,
    rubric: state.answerRubric,
    studentAnswer: state.studentAnswer,
  });
  const { text: raw, usage } = await completeTextTracked(
    VP_EVAL_SYSTEM,
    user,
    { jsonMode: true, tier: "economy" },
  );
  const parsed = parseEvalJson(raw);
  const cfo = cfoSlice(state, usage, "CFO (채점)");
  const prevSolved = state.problemsSolved ?? 0;
  const add = parsed.correct ? 1 : 0;
  const nextTotal = prevSolved + add;
  const maxP = state.maxProblems ?? 3;
  const done = parsed.correct && nextTotal >= maxP;
  return {
    lastEvaluationCorrect: parsed.correct,
    evaluationFeedback: parsed.feedback,
    studentAnswer: "",
    problemsSolved: parsed.correct ? 1 : 0,
    sessionComplete: done,
    totalTokenUsage: cfo.totalTokenUsage,
    accumulatedCost: cfo.accumulatedCost,
    estimatedCost: cfo.estimatedCost,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "problem" as const,
        message: parsed.correct
          ? `정답 처리: ${parsed.feedback}`
          : `오답: ${parsed.feedback}`,
        metadata: { correct: parsed.correct },
      },
      ...(done
        ? [
            {
              at: new Date().toISOString(),
              phase: "problem" as const,
              message: `세션 완료: ${nextTotal}/${maxP}문항 해결.`,
            },
          ]
        : []),
      ...cfo.feedbackLog,
    ],
  };
}

export async function vpTutorNode(state: VisualProblemState) {
  const nextHint = (state.hintLevel ?? 0) + 1;
  const user = buildVpTutorUser({
    visualGroundingJson: groundingJson(state.visualGrounding),
    question: state.currentQuestion,
    rubric: state.answerRubric,
    studentAnswer: state.studentAnswer || "(empty)",
    evaluationFeedback: state.evaluationFeedback,
    hintLevel: nextHint,
  });
  const { text: hint, usage } = await completeTextTracked(
    VP_TUTOR_SYSTEM,
    user,
    { tier: "economy" },
  );
  const cfo = cfoSlice(state, usage, "CFO (크리에이티브 튜터)");
  return {
    tutorHint: hint.trim(),
    hintLevel: nextHint,
    totalTokenUsage: cfo.totalTokenUsage,
    accumulatedCost: cfo.accumulatedCost,
    estimatedCost: cfo.estimatedCost,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "tutor" as const,
        message: `힌트(L${nextHint}): ${hint.trim().slice(0, 400)}${hint.length > 400 ? "…" : ""}`,
      },
      ...cfo.feedbackLog,
    ],
  };
}
