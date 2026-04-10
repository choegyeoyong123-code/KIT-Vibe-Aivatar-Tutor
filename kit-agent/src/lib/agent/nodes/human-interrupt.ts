import type { AgentGraphNodeId } from "@/lib/agent/types";
import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";

/**
 * interruptBefore 직후 재개되면 실행됩니다.
 * 실제 분기는 hitlNextRoute·pendingExitStrategy(Resume API의 Command.update)가 결정합니다.
 */
export async function humanInterruptNode(state: AgentState) {
  const hint = state.exitInstruction.trim()
    ? ` 사용자 지시: "${state.exitInstruction.slice(0, 200)}${state.exitInstruction.length > 200 ? "…" : ""}"`
    : "";
  const route = state.hitlNextRoute ?? "미지정";
  const to: AgentGraphNodeId =
    state.hitlNextRoute === "exit_processor"
      ? "Exit_Processor"
      : state.hitlNextRoute === "workflow"
        ? "Knowledge_Distiller"
        : "Session_Terminal";
  return {
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "hitl" as const,
        message: `Human 노드: 다음 라우트=${state.hitlNextRoute ?? "미지정"}${hint}`,
        metadata: {
          hitlNextRoute: state.hitlNextRoute,
          terminationType: state.terminationType,
          pendingExitStrategy: state.pendingExitStrategy,
        },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Human_Approval_Gateway",
        to,
        taskDone: `Resume OK; route=${route}.`,
        keyFindings: state.exitInstruction.trim()
          ? "Operator text captured (truncated in structured)."
          : "No extra exitInstruction text.",
        nextAction:
          state.hitlNextRoute === "exit_processor"
            ? "Exit_Processor: run exit strategy."
            : state.hitlNextRoute === "workflow"
              ? "Distill/validate chain: continue automation."
              : "Idle until next Command.resume.",
        terminalLine: `Human_Approval_Gateway: Released graph (${route}).`,
        structured: {
          hitlNextRoute: state.hitlNextRoute,
          exitSnippet: state.exitInstruction.slice(0, 80),
        },
      }),
    ],
  };
}
