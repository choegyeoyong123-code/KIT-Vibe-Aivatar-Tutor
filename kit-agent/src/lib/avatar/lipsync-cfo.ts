import {
  DEFAULT_AVATAR_LIPSYNC_APPROVAL_USD,
  DEFAULT_AVATAR_LIPSYNC_USD_PER_SEC,
} from "@/lib/avatar/constants";

function envNum(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function estimateLipSyncJobUsd(durationSec: number): number {
  const rate = envNum(
    "AVATAR_LIPSYNC_USD_PER_SEC",
    DEFAULT_AVATAR_LIPSYNC_USD_PER_SEC,
  );
  return durationSec * rate;
}

/** 추정 비용이 한도를 넘으면 HITL (기본 $2) */
export function shouldRequireLipSyncHitl(estimatedUsd: number): boolean {
  const cap = envNum(
    "AVATAR_LIPSYNC_APPROVAL_USD",
    DEFAULT_AVATAR_LIPSYNC_APPROVAL_USD,
  );
  return estimatedUsd > cap;
}
