/**
 * Strategy 10 — 페르소나 맞춤 교육 (Knowledge_Distiller + 아바타 톤 정합)
 */
export const LEARNING_PERSONA_IDS = [
  "beginner_analogies",
  "standard_kit",
  "expert_technical",
] as const;

export type LearningPersonaId = (typeof LEARNING_PERSONA_IDS)[number];

export const LEARNING_PERSONA_LABELS: Record<LearningPersonaId, string> = {
  beginner_analogies: "초심자 · 비유·직관 중심",
  standard_kit: "표준 KIT 강의실 톤",
  expert_technical: "전문가 · 기술 깊이·정밀 용어",
};

export const DEFAULT_LEARNING_PERSONA: LearningPersonaId = "standard_kit";

export function parseLearningPersonaId(raw: unknown): LearningPersonaId {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_LEARNING_PERSONA;
  const v = raw.trim() as LearningPersonaId;
  return LEARNING_PERSONA_IDS.includes(v) ? v : DEFAULT_LEARNING_PERSONA;
}
