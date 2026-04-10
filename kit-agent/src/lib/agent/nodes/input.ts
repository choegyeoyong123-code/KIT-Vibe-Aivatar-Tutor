import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";

export async function inputNode(state: AgentState) {
  const count = state.originalMaterials.length;
  const kinds = state.originalMaterials.map((m) => m.kind).join(", ") || "—";
  return {
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "input" as const,
        message: `원자료 ${count}건 수신. 증류 단계로 전달합니다.`,
        metadata: {
          materials: state.originalMaterials.map((m) => ({
            kind: m.kind,
            id: m.id,
            filename: m.filename,
          })),
        },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Input_Node",
        to: "CrossModal_Align",
        taskDone: `Ingested ${count} multimodal slot(s); metadata logged.`,
        keyFindings: `Kinds present: ${kinds}.`,
        nextAction: "Align video concepts to PDF anchors for citations.",
        terminalLine: `Input_Node: Accepted ${count} KIT material(s) (${kinds}).`,
        structured: { materialCount: count },
      }),
    ],
  };
}
