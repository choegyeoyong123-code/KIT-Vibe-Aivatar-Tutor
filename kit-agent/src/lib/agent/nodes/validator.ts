import { buildMasterContext } from "@/lib/agent/master-context";
import {
  VALIDATE_SYSTEM,
  buildValidateUserPayload,
  parseValidationJson,
} from "@/lib/agent/prompts/validate";
import { completeTextTracked, llmOptionsFromAgentState } from "@/lib/agent/llm";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import type { AgentState } from "@/lib/agent/state";
import type { ValidationResultPayload, ValidatorNextGraphNode } from "@/lib/agent/types";
import { QUALITY_PASS_THRESHOLD } from "@/lib/agent/constants";

export async function validatorNode(state: AgentState) {
  const masterContext = buildMasterContext(state.originalMaterials);
  const user = buildValidateUserPayload({
    masterContext,
    structuredSummary: state.structuredSummary,
    distilledData: state.distilledData,
  });

  const { text: raw, usage } = await completeTextTracked(VALIDATE_SYSTEM, user, {
    jsonMode: true,
    ...llmOptionsFromAgentState(state),
  });
  let parseErr: string | null = null;
  let result: ValidationResultPayload;
  try {
    result = parseValidationJson(raw);
  } catch {
    parseErr = "Validator JSON parse failed — applied safe fallback score.";
    result = {
      score: 7,
      technicalAccuracy: "JSON 파싱 실패 — 수동 재시도 필요",
      coverage: "",
      clarity: "",
      goalAlignment: "",
      rewriteInstructions:
        "검증 응답을 스키마대로 JSON만 출력. goalAlignment·nextNode 포함.",
      nextNode: "Knowledge_Distiller",
    };
  }

  const pass = result.score >= QUALITY_PASS_THRESHOLD;
  const nextNode: ValidatorNextGraphNode =
    result.nextNode ?? (pass ? "CFO_Agent" : "Knowledge_Distiller");
  const message = pass
    ? `[next=${nextNode}] ${result.score}/10 통과 — 합의 감사·과금 단계로 진행.`
    : `[next=${nextNode}] ${result.score}/10 미달 — ${result.rewriteInstructions.slice(0, 280)}${result.rewriteInstructions.length > 280 ? "…" : ""}`;

  return {
    qualityScore: result.score,
    loopCount: 1,
    lastLlmUsage: usage,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "validate" as const,
        message,
        metadata: {
          score: result.score,
          pass,
          nextNode,
          technicalAccuracy: result.technicalAccuracy,
          coverage: result.coverage,
          goalAlignment: result.goalAlignment,
          clarity: result.clarity,
          rewriteInstructions: result.rewriteInstructions,
        },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Validator_Agent",
        to: nextNode,
        taskDone: `Scored note ${result.score}/10 (${pass ? "PASS" : "FAIL"}).`,
        keyFindings: pass
          ? "Accuracy+clarity+goal alignment OK for CFO path."
          : `Rewrite: ${result.rewriteInstructions.slice(0, 120)}${result.rewriteInstructions.length > 120 ? "…" : ""}`,
        nextAction: pass
          ? "Consensus_Auditor → CFO billing window."
          : "Knowledge_Distiller: apply rewriteInstructions; keep under 100 tok handoff.",
        errors: parseErr,
        terminalLine: `Validator_Agent: ${result.score}/10 ${pass ? "pass → CFO_Agent" : "fail → Knowledge_Distiller"}.`,
        structured: { score: result.score, pass, nextNode },
      }),
    ],
  };
}
