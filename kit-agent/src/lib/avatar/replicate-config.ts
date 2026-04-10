/**
 * Replicate 기반 AI 아바타 합성이 사용 불가일 때 사용자에게 표시하는 고정 문구.
 * (요약·미디어 스튜디오 등 다른 기능은 그대로 동작)
 */
export const AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE =
  "Avatar Generation is currently unavailable";

export function hasReplicateToken(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN?.trim());
}

/** 마스터 아바타(Replicate) 호출 가능 여부 */
export function isMasterAvatarReplicateConfigured(): boolean {
  return (
    hasReplicateToken() &&
    Boolean(process.env.REPLICATE_MASTER_AVATAR_VERSION?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim())
  );
}

/** Wav2Lip 등 립싱크(Replicate) 호출 가능 여부 */
export function isWav2lipReplicateConfigured(): boolean {
  return (
    hasReplicateToken() &&
    Boolean(process.env.REPLICATE_WAV2LIP_VERSION?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim())
  );
}
