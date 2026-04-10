import type { DynamicPersonaId, PersonaMediaCostTier } from "@/lib/agent/persona/types";

export const DEFAULT_DYNAMIC_PERSONA_ID: DynamicPersonaId = "warm_instructor";

export interface PersonaMediaProfile {
  /** OpenAI TTS 등 클라이언트 힌트 */
  ttsSpeed: number;
  /** SSML/대본에 삽입할 리듬 힌트(쉼표·줄바꿈 권장) */
  rhythmPauses: boolean;
  voiceCharacter: string;
  /** REPLICATE_WAV2LIP 입력에 병합(모델이 지원할 때만 효과) */
  wav2lipInputExtra: Record<string, unknown>;
  /** REPLICATE_MASTER_AVATAR 프롬프트에 덧붙일 표현 힌트 */
  masterAvatarPromptSuffix: string;
  mediaCostTier: PersonaMediaCostTier;
}

/** UI·FinOps 분해용 페르소나 목록(순서 고정) */
export const DYNAMIC_PERSONA_IDS: DynamicPersonaId[] = [
  "warm_instructor",
  "strict_coach",
  "energetic_rapper",
  "zen_guide",
  "curious_explorer",
];

const PRESETS: Record<DynamicPersonaId, PersonaMediaProfile & { labelKo: string }> = {
  warm_instructor: {
    labelKo: "따뜻한 강사",
    ttsSpeed: 0.95,
    rhythmPauses: true,
    voiceCharacter: "soothing, warm, reassuring",
    wav2lipInputExtra: { fps: 25 },
    masterAvatarPromptSuffix:
      ", soft smile, relaxed eyebrows, gentle micro-expressions suitable for KIT Academy",
    mediaCostTier: "low",
  },
  strict_coach: {
    labelKo: "엄격한 코치",
    ttsSpeed: 1.02,
    rhythmPauses: false,
    voiceCharacter: "firm, precise, minimal filler",
    wav2lipInputExtra: { fps: 25 },
    masterAvatarPromptSuffix:
      ", focused gaze, neutral mouth, disciplined posture — professional exam-prep tone",
    mediaCostTier: "low",
  },
  energetic_rapper: {
    labelKo: "에너제틱 랩퍼",
    ttsSpeed: 1.12,
    rhythmPauses: true,
    voiceCharacter: "rhythmic delivery, syncopation, high energy but classroom-safe lyrics",
    wav2lipInputExtra: { fps: 30 },
    masterAvatarPromptSuffix:
      ", dynamic eyebrows, wider mouth motion for rhythmic speech, still school-appropriate",
    mediaCostTier: "high",
  },
  zen_guide: {
    labelKo: "젠 가이드",
    ttsSpeed: 0.88,
    rhythmPauses: true,
    voiceCharacter: "calm, slow, meditative pacing",
    wav2lipInputExtra: { fps: 24 },
    masterAvatarPromptSuffix:
      ", serene expression, minimal jaw motion, soft lighting feel",
    mediaCostTier: "low",
  },
  curious_explorer: {
    labelKo: "호기심 탐험가",
    ttsSpeed: 1.0,
    rhythmPauses: true,
    voiceCharacter: "inquisitive, playful but scholarly",
    wav2lipInputExtra: { fps: 25 },
    masterAvatarPromptSuffix:
      ", slightly raised brows, attentive eyes — discovery learning mood",
    mediaCostTier: "low",
  },
};

export function isDynamicPersonaId(v: string): v is DynamicPersonaId {
  return v in PRESETS;
}

/** 랜딩 갤러리·FormData `galleryPersonaId` */
export function parseGalleryPersonaId(raw: unknown): DynamicPersonaId | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t || !isDynamicPersonaId(t)) return undefined;
  return t;
}

export function getPersonaMediaProfile(id: DynamicPersonaId): PersonaMediaProfile {
  const p = PRESETS[id];
  return {
    ttsSpeed: p.ttsSpeed,
    rhythmPauses: p.rhythmPauses,
    voiceCharacter: p.voiceCharacter,
    wav2lipInputExtra: { ...p.wav2lipInputExtra },
    masterAvatarPromptSuffix: p.masterAvatarPromptSuffix,
    mediaCostTier: p.mediaCostTier,
  };
}

export function personaLabelKo(id: DynamicPersonaId): string {
  return PRESETS[id].labelKo;
}

/**
 * Knowledge_Distiller 시스템 프롬프트에 덧붙이는 런타임 블록.
 */
export function buildDistillerDynamicPersonaAugment(id: DynamicPersonaId): string {
  const label = personaLabelKo(id);
  const media = getPersonaMediaProfile(id);
  return [
    "## DYNAMIC_RUNTIME_PERSONA (Persona_Manager — 최우선 톤 제약)",
    `**current_persona_id**: \`${id}\` (${label})`,
    `**media_cost_tier**: \`${media.mediaCostTier}\` (high = 아바타·립싱크 재생성 부담 가능)`,
    "",
    "위 페르소나에 맞춰 **세 가지 pedagogy 변형**의 *말투·비유 밀도·문장 리듬*을 조정하되, **사실·인용·JSON 스키마**는 기존 Knowledge_Distiller 규칙을 그대로 따릅니다.",
    "",
    "### 페르소나별 톤 힌트",
    `- **warm_instructor**: 격려·명료·교실 예의; 과장된 유행어 금지.`,
    `- **strict_coach**: 간결·기준 중심·오류 지적은 사실 근거만.`,
    `- **energetic_rapper**: 운율·리듬감은 살리되 **교육적·비속어·혐오·선정 금지**.`,
    `- **zen_guide**: 느린 호흡·차분한 문장.`,
    `- **curious_explorer**: 질문 유도·탐구 톤.`,
    "",
    "### 멀티모달 정합 (아바타·TTS와의 공명)",
    `TTS 힌트: speed≈${media.ttsSpeed}, rhythm_pauses=${media.rhythmPauses}, character=${media.voiceCharacter}`,
    "아바타 표정·립싱크는 위 톤과 충돌하지 않게 서술하세요.",
  ].join("\n");
}
