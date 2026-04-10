import {
  DEFAULT_MEDIA_RENDER_HITL_USD,
  DEFAULT_MEDIA_TTS_USD_PER_1K_CHARS,
  DEFAULT_MEDIA_VIDEO_USD_PER_SCENE,
} from "@/lib/media-persona/constants";
import type { MediaCostBreakdown } from "@/lib/media-persona/types";

function envNum(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function estimatePhase3Usd(input: {
  sceneCount: number;
  dialogueCharCount: number;
}): { video: number; tts: number; total: number } {
  const perScene = envNum(
    "MEDIA_VIDEO_USD_PER_SCENE",
    DEFAULT_MEDIA_VIDEO_USD_PER_SCENE,
  );
  const per1k = envNum(
    "MEDIA_TTS_USD_PER_1K_CHARS",
    DEFAULT_MEDIA_TTS_USD_PER_1K_CHARS,
  );
  const video = input.sceneCount * perScene;
  const tts = (input.dialogueCharCount / 1000) * per1k;
  return { video, tts, total: video + tts };
}

export function shouldRequireRenderHitl(phase3EstimateTotal: number): boolean {
  const threshold = envNum(
    "MEDIA_RENDER_HITL_USD",
    DEFAULT_MEDIA_RENDER_HITL_USD,
  );
  return phase3EstimateTotal >= threshold;
}

export function buildCostBreakdown(input: {
  phase12LlmUsd: number;
  sceneCount: number;
  dialogueCharCount: number;
}): MediaCostBreakdown {
  const p3 = estimatePhase3Usd({
    sceneCount: input.sceneCount,
    dialogueCharCount: input.dialogueCharCount,
  });
  return {
    phase12LlmUsd: input.phase12LlmUsd,
    phase3VideoEstimateUsd: p3.video,
    phase3TtsEstimateUsd: p3.tts,
    phase3TotalEstimateUsd: p3.total,
    grandTotalEstimateUsd: input.phase12LlmUsd + p3.total,
  };
}
