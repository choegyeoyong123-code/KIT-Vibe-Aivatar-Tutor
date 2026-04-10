import { buildMasterContext } from "@/lib/agent/master-context";
import {
  CONSENSUS_AUDIT_SYSTEM,
  buildConsensusAuditUserPayload,
  parseConsensusAuditJson,
} from "@/lib/agent/prompts/consensus-audit";
import { runConsensusAuditorLLM } from "@/lib/agent/llm-consensus";
import { usdCostForTokens } from "@/lib/agent/pricing";
import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import {
  CONSENSUS_TRUST_THRESHOLD,
  MAX_CONSENSUS_REFINEMENT_LOOPS,
} from "@/lib/agent/constants";

/**
 * 주 LLM 요약을 2차 모델로 대조 — 환각 시 증류 루프로 되돌림.
 */
export async function consensusAuditorNode(state: AgentState) {
  const sourcePack = buildMasterContext(state.originalMaterials);
  const user = buildConsensusAuditUserPayload({
    sourcePack,
    proposedSummary: state.structuredSummary,
  });

  let parsed;
  let usage;
  let consensusParseError: string | null = null;
  try {
    const res = await runConsensusAuditorLLM(CONSENSUS_AUDIT_SYSTEM, user);
    usage = res.usage;
    parsed = parseConsensusAuditJson(res.text);
  } catch (e) {
    consensusParseError = e instanceof Error ? e.message : String(e);
    parsed = {
      trustScore: 72,
      educationHallucinations: [`감사 JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`],
      groundedEnough: false,
      refinementInstructions: "요약을 SOURCE_PACK에만 근거하도록 다시 작성하세요.",
    };
    usage = {
      inputTokens: 0,
      outputTokens: 0,
      modelId: "consensus-error",
    };
  }

  const deltaUsd = usdCostForTokens(
    usage.modelId,
    usage.inputTokens,
    usage.outputTokens,
  );
  const tokens = usage.inputTokens + usage.outputTokens;

  const refinements = state.consensusRefinementCount ?? 0;
  const needRefine =
    (!parsed.groundedEnough || parsed.trustScore < CONSENSUS_TRUST_THRESHOLD) &&
    refinements < MAX_CONSENSUS_REFINEMENT_LOOPS;

  const notes = [
    `Trust ${parsed.trustScore}/100.`,
    parsed.educationHallucinations.length
      ? `Hallucinations: ${parsed.educationHallucinations.join(" | ")}`
      : "No explicit hallucination list.",
  ].join(" ");

  if (needRefine) {
    return {
      totalTokenUsage: tokens,
      accumulatedCost: deltaUsd,
      trustScore: parsed.trustScore,
      consensusAuditNotes: notes,
      auditorRefinementRequired: true,
      consensusRefinementCount: refinements + 1,
      consensusRefinementFeedback: [
        "## 합의 감사(2차 LLM) 수정 지시",
        parsed.refinementInstructions || "원자료에 없는 주장을 제거하고 근거만 남기세요.",
        "",
        "### 지적된 환각 후보",
        ...parsed.educationHallucinations.map((h) => `- ${h}`),
      ].join("\n"),
      feedbackLog: [
        {
          at: new Date().toISOString(),
          phase: "consensus" as const,
          message: `합의 감사: Trust ${parsed.trustScore}/100 — 정제 루프로 되돌립니다 (${refinements + 1}/${MAX_CONSENSUS_REFINEMENT_LOOPS}).`,
          metadata: {
            trustScore: parsed.trustScore,
            hallucinations: parsed.educationHallucinations,
          },
        },
      ],
      interAgentMessages: [
        handoff({
          from: "Consensus_Auditor",
          to: "Knowledge_Distiller",
          taskDone: `Refinement loop ${refinements + 1}/${MAX_CONSENSUS_REFINEMENT_LOOPS} triggered.`,
          keyFindings: `Trust ${parsed.trustScore}/100; grounded=${parsed.groundedEnough}.`,
          nextAction: "Distill: apply consensus feedback JSON-only.",
          errors: consensusParseError,
          terminalLine: `Consensus_Auditor: Trust ${parsed.trustScore} — sending distill rework.`,
          structured: { trustScore: parsed.trustScore, refinementLoop: refinements + 1 },
        }),
      ],
    };
  }

  return {
    totalTokenUsage: tokens,
    accumulatedCost: deltaUsd,
    trustScore: parsed.trustScore,
    consensusAuditNotes: notes,
    auditorRefinementRequired: false,
    consensusRefinementFeedback: "",
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "consensus" as const,
        message: `합의 감사 통과: Trust ${parsed.trustScore}/100.`,
        metadata: {
          trustScore: parsed.trustScore,
          hallucinations: parsed.educationHallucinations,
        },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Consensus_Auditor",
        to: "CFO_Agent",
        taskDone: `Audit clear; trust=${parsed.trustScore}/100.`,
        keyFindings: `Consensus charge ~$${deltaUsd.toFixed(4)}; tok=${tokens}.`,
        nextAction: "CFO post-validate books burn → Admin.",
        errors: consensusParseError,
        terminalLine: `Consensus_Auditor: Passed at trust ${parsed.trustScore}.`,
        structured: { trustScore: parsed.trustScore, deltaUsd, tokens },
      }),
    ],
  };
}
