import type { AgentState } from "@/lib/agent/state";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import {
  buildDistillerDynamicPersonaAugment,
  DEFAULT_DYNAMIC_PERSONA_ID,
  getPersonaMediaProfile,
  isDynamicPersonaId,
  personaLabelKo,
} from "@/lib/agent/persona/persona-presets";
import { scanPersonaChangeIntent } from "@/lib/agent/persona/persona-scan";
import {
  revertPersona,
  verifyEducationalPersonaRequest,
} from "@/lib/agent/persona/persona-security";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";

function normalizeStoredPersona(raw: string | undefined): DynamicPersonaId {
  if (raw && isDynamicPersonaId(raw)) return raw;
  return DEFAULT_DYNAMIC_PERSONA_ID;
}

/**
 * Persona_Manager: 사용자 입력을 스캔해 currentPersona를 갱신하고,
 * Knowledge_Distiller에 주입할 동적 시스템 조각을 만듭니다.
 * 고비용 페르소나 전환 시 CFO에게 핸드오프합니다.
 */
export async function personaManagerNode(state: AgentState) {
  const combined = [
    state.summarizationInstruction ?? "",
    state.exitInstruction ?? "",
  ]
    .join("\n")
    .trim();

  const previous = normalizeStoredPersona(state.currentPersonaId);
  const scanned = scanPersonaChangeIntent(combined);
  let next: DynamicPersonaId = previous;
  let personaSafetyPendingHitl = false;
  let personaSafetyMessage: string | null = null;
  let personaSwitchNote = "";

  if (scanned) {
    const gate = verifyEducationalPersonaRequest(combined, scanned);
    if (!gate.ok) {
      next = revertPersona();
      personaSwitchNote = `Security_Guardian: 요청 거부 — ${gate.reasonKo}`;
      if (gate.action === "hitl") {
        personaSafetyPendingHitl = true;
        personaSafetyMessage = `[Persona 안전] ${gate.reasonKo}`;
      }
    } else {
      next = gate.personaId;
      personaSafetyPendingHitl = false;
      personaSafetyMessage = null;
      personaSwitchNote =
        previous === next
          ? `Persona_Manager: "${personaLabelKo(next)}" 유지.`
          : `Persona_Manager: "${personaLabelKo(previous)}" → "${personaLabelKo(next)}" 전환.`;
    }
  } else {
    personaSafetyPendingHitl = false;
    personaSafetyMessage = null;
    personaSwitchNote = `Persona_Manager: 스캔 히트 없음 — "${personaLabelKo(next)}" 유지.`;
  }

  const augment = buildDistillerDynamicPersonaAugment(next);
  const profile = getPersonaMediaProfile(next);
  const changed = previous !== next;
  const highCostSwitch = changed && profile.mediaCostTier === "high";

  const interAgentMessages = [];
  if (highCostSwitch) {
    interAgentMessages.push(
      handoff({
        from: "Persona_Manager",
        to: "CFO_Agent",
        taskDone: `Dynamic persona switched to ${next} (high media tier).`,
        keyFindings:
          "Avatar/Wav2Lip/TTS 재동기화가 필요할 수 있어 추정 비용·슬롯 사용이 증가합니다.",
        nextAction: "CFO: reserve budget for multimodal persona resonance pass.",
        terminalLine: `Persona_Manager: HIGH-COST persona switch → ${next}; CFO please book lip-sync + render.`,
        structured: {
          previousPersonaId: previous,
          nextPersonaId: next,
          mediaCostTier: profile.mediaCostTier,
        },
      }),
    );
  } else if (changed) {
    interAgentMessages.push(
      handoff({
        from: "Persona_Manager",
        to: "CFO_Agent",
        taskDone: `Persona updated to ${next} (low media tier).`,
        keyFindings: "Text-only distill tone shift; avatar regen optional.",
        nextAction: "CFO: nominal token delta only.",
        terminalLine: `Persona_Manager: persona switch ${previous}→${next} (low cost).`,
        structured: { previousPersonaId: previous, nextPersonaId: next },
      }),
    );
  }

  return {
    currentPersonaId: next,
    distillerDynamicAugmentation: augment,
    personaMediaCostTier: profile.mediaCostTier,
    personaSafetyPendingHitl,
    personaSafetyMessage,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "protocol" as const,
        message: [
          personaSwitchNote,
          `Security_Guardian: ${scanned ? "페르소나 요청 검증 완료." : "전환 키워드 없음."}`,
        ].join(" "),
        metadata: {
          personaManager: true,
          previousPersonaId: previous,
          currentPersonaId: next,
          scannedIntent: scanned ?? null,
          mediaCostTier: profile.mediaCostTier,
        },
      },
    ],
    interAgentMessages,
  };
}
