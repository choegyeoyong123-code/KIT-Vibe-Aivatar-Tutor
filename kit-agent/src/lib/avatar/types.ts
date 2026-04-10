import type { DistilledData } from "@/lib/agent/types";
import type { PersonaMediaProfile } from "@/lib/agent/persona/persona-presets";

export type { PersonaMediaProfile };

export type AvatarStylePreset =
  | "3d_animation"
  | "cel_anime"
  | "flat_vector";

export interface MasterAvatarResult {
  /** 정적 파일 URL (/avatar-cache/...) */
  url: string;
  /** 선택: data URL (데모·미리보기) */
  base64DataUrl?: string;
  provider: "replicate" | "sharp_stylize" | "passthrough";
  sessionId: string;
  stylePreset: AvatarStylePreset;
  /** Replicate 마스터 아바타 모델을 실제로 호출했는지 */
  replicateSynthesisUsed: boolean;
  /**
   * Replicate 미설정/실패 시 사용자 안내 (요약 등 다른 기능과 무관).
   * 미설정 시 고정 문구 `Avatar Generation is currently unavailable`.
   */
  userMessage?: string;
}

export interface AvatarLectureJob {
  masterAvatarUrl: string;
  audioUrl: string;
  topicContext: string;
  durationSec: number;
  estimatedLipSyncUsd: number;
  hitlRequired: boolean;
  createdAt: number;
  /** 사용자·대시보드에서 붙인 마크다운 — 비디오 폴백 시 최우선 */
  studyGuideMarkdown?: string;
  /** Strategy 9: 증류 스키마 기반 정적 가이드 (JSON 직렬화 저장) */
  distilledData?: DistilledData;
  /**
   * Privacy Protocol: user confirms source selfie removed from their device.
   * Required for render when `KIT_SECURITY_GATE_STRICT=1`.
   */
  userPhotoDeletionAcknowledged?: boolean;
  /** Persona_Manager / 클라이언트: 립싱크·TTS·마스터 표정과 정합 */
  kitPersonaId?: string;
  personaMediaHints?: PersonaMediaProfile | null;
}

export interface AvatarLectureRenderResult {
  lipSyncVideoUrl: string;
  finalVideoUrl: string;
  backgroundLabel: string;
  mode: "replicate_wav2lip" | "static_ken_burns";
  cfoMessage: string;
}
