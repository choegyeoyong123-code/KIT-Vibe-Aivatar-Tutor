import { completeTextTracked, llmOptionsFromAgentState } from "@/lib/agent/llm";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import type { AgentState } from "@/lib/agent/state";
import type { ExitProcessingStrategy } from "@/lib/agent/types";

const DIRECT_ANSWER_SYSTEM = `You are a concise teaching assistant for KIT lecture materials.
Answer ONLY using the CONTEXT below. If the answer is not in the context, say you cannot infer it from the materials.
No marketing or social media language.`;

function strategyOf(state: AgentState): ExitProcessingStrategy {
  return state.pendingExitStrategy ?? "partial_wrap";
}

function buildPartialWrapDocument(state: AgentState): string {
  const trail = state.feedbackLog
    .filter((e) => e.phase === "distill" || e.phase === "validate")
    .map((e) => `- **${e.phase}** (${e.at}): ${e.message}`)
    .join("\n");

  const custom = state.exitInstruction.trim();
  const customBlock = custom
    ? `\n### 사용자 종료 지시\n${custom}\n`
    : "";

  return [
    "## 통합 학습 노트 (부분 마무리)",
    "",
    "### 현재 확정 요약",
    state.structuredSummary.trim() || "(요약 없음)",
    "",
    "### 협업·검증 이력",
    trail || "(이력 없음)",
    customBlock,
  ].join("\n");
}

/**
 * Graceful Finalizer: 부분 마무리 / 모델 다운그레이드 / 직접 답변 / 유저 중단.
 */
export async function exitProcessorNode(state: AgentState) {
  const strategy = strategyOf(state);
  const at = new Date().toISOString();

  if (strategy === "user_abort") {
    return {
      structuredSummary: [
        "## 세션 중단 (USER_ABORT)",
        "",
        "사용자 요청으로 워크플로를 종료했습니다.",
        "",
        "### 직전 요약 (보존)",
        state.structuredSummary.trim() || "(없음)",
      ].join("\n"),
      finalQuiz: null,
      userPermissionStatus: "finalized_early" as const,
      terminationType: "USER_ABORT" as const,
      pendingExitStrategy: null,
      hitlNextRoute: null,
      exitProcessorNext: "end" as const,
      feedbackLog: [
        {
          at,
          phase: "exit" as const,
          message: "Exit Processor: 사용자 중단 처리 완료.",
          metadata: { strategy: "user_abort" },
        },
      ],
      interAgentMessages: [
        handoff({
          from: "Exit_Processor",
          to: "Session_Terminal",
          taskDone: "USER_ABORT — summary banner applied.",
          keyFindings: "Quiz cleared; early finalize flag set.",
          nextAction: "Freeze thread; await new session.",
          terminalLine: "Exit_Processor: User aborted — state sealed.",
          structured: { strategy: "user_abort" as const },
        }),
      ],
    };
  }

  if (strategy === "model_downgrade") {
    return {
      activeModelTier: "economy" as const,
      userPermissionStatus: "approved" as const,
      terminationType: "GRACEFUL_EXIT" as const,
      pendingExitStrategy: null,
      hitlNextRoute: null,
      exitProcessorNext: "distill" as const,
      hitlPending: false,
      interruptRequired: false,
      hitlBlockReasons: [] as string[],
      feedbackLog: [
        {
          at,
          phase: "exit" as const,
          message:
            "Exit Processor: 이후 LLM 호출을 economy 티어(gpt-4o-mini / gemini-flash 등)로 전환합니다.",
          metadata: { strategy: "model_downgrade" },
        },
      ],
      interAgentMessages: [
        handoff({
          from: "Exit_Processor",
          to: "Knowledge_Distiller",
          taskDone: "Tier switched to economy for next LLM hops.",
          keyFindings: "HITL flags cleared for rerun.",
          nextAction: "Distill: rerun with cheaper models.",
          terminalLine: "Exit_Processor: Downgraded model tier to economy.",
          structured: { strategy: "model_downgrade" as const },
        }),
      ],
    };
  }

  if (strategy === "direct_answer") {
    const q = state.exitInstruction.trim() || "요약된 내용의 핵심을 한 문단으로 설명해 주세요.";
    const context = [
      "## structuredSummary",
      state.structuredSummary,
      "## extractedText (발췌)",
      state.extractedText.slice(0, 24_000),
    ].join("\n\n");

    let answer = "";
    let directAnswerErr: string | null = null;
    try {
      const { text } = await completeTextTracked(
        DIRECT_ANSWER_SYSTEM,
        `${context}\n\n## 질문\n${q}`,
        llmOptionsFromAgentState(state),
      );
      answer = text;
    } catch (e) {
      directAnswerErr = e instanceof Error ? e.message : String(e);
      answer = `(답변 생성 실패) ${e instanceof Error ? e.message : String(e)}`;
    }

    return {
      structuredSummary: [
        state.structuredSummary.trim(),
        "",
        "## 직접 답변 (HITL)",
        answer,
      ]
        .filter(Boolean)
        .join("\n\n"),
      userPermissionStatus: "finalized_early" as const,
      terminationType: "GRACEFUL_EXIT" as const,
      pendingExitStrategy: null,
      hitlNextRoute: null,
      exitProcessorNext: "end" as const,
      feedbackLog: [
        {
          at,
          phase: "exit" as const,
          message: "Exit Processor: 질문에 대한 직접 답변을 붙이고 종료합니다.",
          metadata: { strategy: "direct_answer" },
        },
      ],
      interAgentMessages: [
        handoff({
          from: "Exit_Processor",
          to: "Session_Terminal",
          taskDone: "HITL Q&A merged into summary doc.",
          keyFindings: "Single-shot answer appended below note.",
          nextAction: "Persist client; no auto-distill.",
          errors: directAnswerErr,
          terminalLine: "Exit_Processor: Direct answer stitched into study note.",
          structured: { strategy: "direct_answer" as const },
        }),
      ],
    };
  }

  // partial_wrap (default graceful)
  const doc = buildPartialWrapDocument(state);
  return {
    structuredSummary: doc,
    userPermissionStatus: "finalized_early" as const,
    terminationType: "GRACEFUL_EXIT" as const,
    pendingExitStrategy: null,
    hitlNextRoute: null,
    exitProcessorNext: "end" as const,
    feedbackLog: [
      {
        at,
        phase: "exit" as const,
        message: "Exit Processor: 중간 산출물을 통합 문서로 정리했습니다.",
        metadata: { strategy: "partial_wrap" },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Exit_Processor",
        to: "Session_Terminal",
        taskDone: "Partial-wrap doc emitted from distill/validate trail.",
        keyFindings: "User note merged when present.",
        nextAction: "Ship artifact to UI; graceful exit.",
        terminalLine: "Exit_Processor: Partial wrap — ready for export.",
        structured: { strategy: "partial_wrap" as const },
      }),
    ],
  };
}
