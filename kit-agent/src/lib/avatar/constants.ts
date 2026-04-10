/** 립싱크·디지털 휴먼 GPU 추정 단가 (USD/초) */
export const DEFAULT_AVATAR_LIPSYNC_USD_PER_SEC = 0.035;

/**
 * 이 금액(USD)을 초과하는 작업은 HITL 승인 필요.
 * 기본: 60초 × 0.035 ≈ $2.10 > $2
 */
export const DEFAULT_AVATAR_LIPSYNC_APPROVAL_USD = 2;
