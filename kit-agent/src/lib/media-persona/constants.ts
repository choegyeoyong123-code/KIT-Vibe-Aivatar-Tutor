/** 씬당 비디오 API 추정 비용 (Veo/Sora 등 — 운영 시 env로 조정) */
export const DEFAULT_MEDIA_VIDEO_USD_PER_SCENE = 0.35;

/** TTS 추정: 대략 $15 / 1M chars (tts-1 계열 가정) */
export const DEFAULT_MEDIA_TTS_USD_PER_1K_CHARS = 0.015;

/**
 * 렌더(TTS+비디오) 추정이 이 USD를 넘으면 HITL 승인 필요.
 * env MEDIA_RENDER_HITL_USD
 */
export const DEFAULT_MEDIA_RENDER_HITL_USD = 0.45;

/** 작업 캐시 TTL (ms) */
export const MEDIA_JOB_TTL_MS = 60 * 60 * 1000;
