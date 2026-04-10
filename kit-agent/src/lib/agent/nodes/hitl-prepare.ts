import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import {
  HITL_COST_THRESHOLD_USD,
  HARD_COST_CAP_USD,
  QUALITY_PASS_THRESHOLD,
} from "@/lib/agent/constants";

/**
 * CFO 이후 HITL 필요 여부를 판정하고 사유를 상태에 기록합니다.
 * Strategy 8: `interruptRequired`(CFO 거버넌스) 또는 비용 상한 시 일시정지.
 */
export async function hitlPrepareNode(state: AgentState) {
  const reasons: string[] = [];

  if (state.personaSafetyPendingHitl && state.personaSafetyMessage?.trim()) {
    reasons.push(state.personaSafetyMessage.trim());
  }

  if (state.interruptRequired) {
    reasons.push(
      `CFO 거버넌스: 검증 루프 ${state.loopCount}회에서 품질 점수가 여전히 ${QUALITY_PASS_THRESHOLD}/10 미만입니다. 자동 재증류를 중단하고 수동 검토(Manual Review)가 필요합니다.`,
    );
  }

  if (state.accumulatedCost > HITL_COST_THRESHOLD_USD) {
    reasons.push(
      `누적 비용 한도 초과 ($${state.accumulatedCost.toFixed(4)} > $${HITL_COST_THRESHOLD_USD}).`,
    );
  }
  if (state.estimatedCost > HITL_COST_THRESHOLD_USD) {
    reasons.push(
      `예상 비용 한도 초과 ($${state.estimatedCost.toFixed(4)} > $${HITL_COST_THRESHOLD_USD}).`,
    );
  }
  if (state.accumulatedCost >= HARD_COST_CAP_USD) {
    reasons.push(
      `절대 비용 상한 도달 또는 초과 ($${state.accumulatedCost.toFixed(4)} ≥ $${HARD_COST_CAP_USD}) — 추가 자율 실행을 차단합니다.`,
    );
  }

  const hitlPending = reasons.length > 0;
  return {
    hitlPending,
    hitlBlockReasons: reasons,
    userPermissionStatus: hitlPending
      ? ("pending_approval" as const)
      : state.userPermissionStatus,
    feedbackLog: hitlPending
      ? [
          {
            at: new Date().toISOString(),
            phase: "hitl" as const,
            message: `승인 대기: ${reasons.join(" ")}`,
            metadata: { reasons, interruptRequired: state.interruptRequired },
          },
        ]
      : [],
    interAgentMessages: [
      handoff({
        from: "HITL_Prepare",
        to: "Policy_Learner",
        taskDone: hitlPending
          ? `HITL ON — ${reasons.length} blocker(s).`
          : "HITL OFF — within policy envelope.",
        keyFindings: `loops=${state.loopCount}; acc~$${state.accumulatedCost.toFixed(3)}; interrupt=${state.interruptRequired}.`,
        nextAction: hitlPending
          ? "Policy: fetch similar HITL plays."
          : "Policy: no-op; router continues.",
        terminalLine: hitlPending
          ? `HITL_Prepare: Paused — ${reasons.length} CFO reason(s).`
          : "HITL_Prepare: Auto-continue approved.",
        structured: { hitlPending, loopCount: state.loopCount },
      }),
    ],
  };
}
