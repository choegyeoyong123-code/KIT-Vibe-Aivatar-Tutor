import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";

/** CFO가 기록한 adminNotification을 협업 로그에 노출(프론트 알림과 동일 페이로드). */
export async function adminAgentNode(state: AgentState) {
  const n = state.adminNotification;
  if (!n) return {};
  return {
    feedbackLog: [
      {
        at: n.at,
        phase: "admin" as const,
        message: `[Admin] ${n.message}`,
        metadata: {
          level: n.level,
          accumulatedCostUsd: n.accumulatedCostUsd,
        },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Admin_Agent",
        to: "HITL_Prepare",
        taskDone: `Mirrored CFO ${n.level} alert to trace.`,
        keyFindings: `Burn snapshot ~$${n.accumulatedCostUsd.toFixed(4)}.`,
        nextAction: "HITL_Prepare: evaluate pause gates.",
        terminalLine: `Admin_Agent: CFO ${n.level} alert surfaced to operators.`,
        structured: { level: n.level, accumulatedCostUsd: n.accumulatedCostUsd },
      }),
    ],
  };
}
