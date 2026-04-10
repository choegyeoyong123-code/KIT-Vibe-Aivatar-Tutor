import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import { searchSimilarPolicy } from "@/lib/policy/vector-store";

/**
 * CFO 일시정지 직전: 로컬 벡터 메모리에서 유사 시나리오를 찾아 권장 행동 문구를 생성합니다.
 */
export async function policyLearnerNode(state: AgentState) {
  if (!state.hitlPending) {
    return {
      policyRecommendation: null,
      policyMatchScore: null,
      interAgentMessages: [
        handoff({
          from: "Policy_Learner",
          to: "Knowledge_Distiller",
          taskDone: "HITL inactive — skipped vector lookup.",
          keyFindings: "No pause flag; graph routes autonomously.",
          nextAction: "Router: distill or tutor per graph.",
          terminalLine: "Policy_Learner: No HITL — skipped policy memory.",
          structured: { hitlPending: false },
        }),
      ],
    };
  }

  const query = [
    `accumulatedCostUsd=${state.accumulatedCost.toFixed(4)}`,
    `estimatedUsd=${state.estimatedCost.toFixed(4)}`,
    `loopCount=${state.loopCount}`,
    `reasons=${state.hitlBlockReasons.join(" | ")}`,
  ].join("; ");

  const hit = await searchSimilarPolicy(query);
  if (!hit) {
    return {
      policyRecommendation: null,
      policyMatchScore: null,
      feedbackLog: [
        {
          at: new Date().toISOString(),
          phase: "policy" as const,
          message: "Policy Learner: 유사 과거 시나리오가 없습니다.",
          metadata: {},
        },
      ],
      interAgentMessages: [
        handoff({
          from: "Policy_Learner",
          to: "Human_Approval_Gateway",
          taskDone: "Policy search: zero similar HITL rows.",
          keyFindings: "Operator sees raw CFO reasons only.",
          nextAction: "Human gateway: show Strategy Commander UI.",
          terminalLine: "Policy_Learner: No past playbook match for this stop.",
          structured: { policyHit: false },
        }),
      ],
    };
  }

  const m = hit.entry.meta;
  const pastCost = Number(m.accumulatedCost ?? 0);
  const instr = (m.exitInstruction ?? "").slice(0, 160);
  const act = m.action ?? "unknown";
  const reco = `과거 유사 정지 (유사도 ${(hit.score * 100).toFixed(0)}%): 비용 약 $${pastCost.toFixed(2)}일 때 "${instr || "(지시 없음)"}" 흐름 후 **${act}**를 선택하셨습니다. 지금도 같은 방향(예: 저비용 모델 전환)으로 진행할까요?`;

  return {
    policyRecommendation: reco,
    policyMatchScore: hit.score,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "policy" as const,
        message: "Policy Learner: 개인화 권장 행동을 생성했습니다.",
        metadata: { matchScore: hit.score },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Policy_Learner",
        to: "Human_Approval_Gateway",
        taskDone: `Matched past HITL (sim ${hit.score.toFixed(2)}).`,
        keyFindings: "Injected 1-line reco into modal payload.",
        nextAction: "Human: merge CFO + policy hint for judge.",
        terminalLine: `Policy_Learner: Suggested prior resolution (sim ${hit.score.toFixed(2)}).`,
        structured: { policyHit: true, policyMatchScore: hit.score },
      }),
    ],
  };
}
