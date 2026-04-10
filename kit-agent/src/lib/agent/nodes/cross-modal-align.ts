import {
  buildCrossModalSourceMappings,
} from "@/lib/agent/alignment/cross-modal-align";
import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";

export async function crossModalAlignNode(state: AgentState) {
  const sourceMappings = await buildCrossModalSourceMappings(state.originalMaterials);
  const n = sourceMappings.length;
  return {
    sourceMappings,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "align" as const,
        message: `크로스모달 정렬: 영상 개념 ${n}건을 PDF 단락과 매핑했습니다.`,
        metadata: { count: n },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "CrossModal_Align",
        to: "Knowledge_Distiller",
        taskDone: `Built ${n} video↔PDF alignment row(s).`,
        keyFindings: "Mapping table ready for [Video MM:SS / PDF p.N] cites.",
        nextAction: "Distill JSON study note grounded in MASTER CONTEXT.",
        terminalLine: `CrossModal_Align: Linked ${n} KIT video cues to PDF pages.`,
        structured: { mappingCount: n },
      }),
    ],
  };
}
