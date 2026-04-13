"use client";

export type VolatilitySnapshot = {
  /** 0–100 UI 게이지 */
  pct: number;
  headline: string;
  detail: string;
};

const DEFAULT_SNAPSHOT: VolatilitySnapshot = {
  pct: 100,
  headline: "휘발성 세션 활성",
  detail:
    "원본 음성·Voice DNA 평문은 디스크에 저장하지 않으며, API 메모리에서 즉시 해제됩니다.",
};

let snapshot: VolatilitySnapshot = DEFAULT_SNAPSHOT;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeDataVolatility(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getDataVolatilitySnapshot(): VolatilitySnapshot {
  return snapshot;
}

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
}

/**
 * 오디오 재생 종료 후 자동 정리까지의 카운트다운을 UI에 반영합니다.
 * @param seconds 소거 예약(기본 60)
 * @param onFire 타이머 만료 시(임시 URL 해제 등)
 */
export function beginPlaybackCleanupCountdown(
  seconds: number,
  onFire: () => void,
): void {
  clearCountdown();
  let left = Math.max(1, Math.floor(seconds));
  snapshot = {
    pct: 72,
    headline: "재생 종료 · 자동 소거 예약",
    detail: `임시 미디어 정리까지 약 ${left}초…`,
  };
  emit();

  countdownTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearCountdown();
      try {
        onFire();
      } finally {
        snapshot = {
          pct: 100,
          headline: "휘발성 100% — 임시 데이터 정리됨",
          detail: "세션 범위에서 임시 오디오·로컬 캐시를 비웠습니다.",
        };
        emit();
        resetTimer = setTimeout(() => {
          snapshot = DEFAULT_SNAPSHOT;
          emit();
        }, 4500);
      }
      return;
    }
    snapshot = {
      ...snapshot,
      pct: Math.max(40, 72 - Math.round(((seconds - left) / seconds) * 32)),
      detail: `임시 미디어 정리까지 약 ${left}초…`,
    };
    emit();
  }, 1000);
}

export function signalVolatileSessionReset(): void {
  clearCountdown();
  snapshot = DEFAULT_SNAPSHOT;
  emit();
}
