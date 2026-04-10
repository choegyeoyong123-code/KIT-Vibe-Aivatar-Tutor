import type { AgentStateSnapshot } from "@/lib/agent/types";
import type { PrivacyTerminalPhase } from "@/components/privacy-security-terminal";
import type { DeletionReceipt } from "@/lib/security/deletion-receipt";

export type SecurityPulsePhase = "idle" | "active" | "success";

export type SecurityPulseSnapshot = {
  phase: SecurityPulsePhase;
  /** Security_Guardian 추적·세션 완료 기준: 원시 바이오메트릭/업로드 프레임이 제거된 것으로 확정 */
  isPhotoDeleted: boolean;
  deletion_receipt?: DeletionReceipt | null;
};

/**
 * 에이전트 트레이스에서 가디언/거버넌스가 업로드·버퍼 제거를 언급했는지 검사합니다.
 */
export function guardianReportsPhotoPurge(state: AgentStateSnapshot | null): boolean {
  if (!state) return false;
  const chunks: string[] = [];
  for (const e of state.feedbackLog) {
    chunks.push(e.message);
  }
  for (const m of state.interAgentMessages ?? []) {
    chunks.push(
      [m.terminalLine, m.bulletSummary, m.errors, JSON.stringify(m.structured ?? null)].join(" "),
    );
  }
  const text = chunks.join("\n");
  return /Strict\s*Deletion|즉시\s*삭제|purged|Purge|buffer\s*purged|원본.*삭제|biometric|바이오|CONFIRMED_DELETED|Zero-?Trust|Session data cleared|encrypt/i.test(
    text,
  );
}

/**
 * Persona Gallery `SecurityPulse`용 스냅샷.
 * - active: 영상·아바타 합성 경로가 살아 있을 때(Encrypting & Processing).
 * - success: 세션이 완료되었고(가디언 로그 또는 최근 미디어 업로드 런) 서버 측 퍼지로 간주.
 */
export function computeSecurityPulseSnapshot(params: {
  videoSynthesisActive: boolean;
  loading: boolean;
  resumeLoading: boolean;
  pendingInterrupt: boolean;
  state: AgentStateSnapshot | null;
  privacyPhase: PrivacyTerminalPhase;
  /** 직전 `runPipeline` 호출 시 비디오/이미지 업로드 포함 여부 */
  lastRunHadVideoOrImage: boolean;
}): SecurityPulseSnapshot {
  if (params.videoSynthesisActive) {
    return { phase: "active", isPhotoDeleted: false };
  }

  const sessionComplete =
    params.privacyPhase === "complete" &&
    params.state != null &&
    !params.loading &&
    !params.resumeLoading &&
    !params.pendingInterrupt;

  const purgeInTrace = guardianReportsPhotoPurge(params.state);
  const isPhotoDeleted =
    sessionComplete && (purgeInTrace || params.lastRunHadVideoOrImage);

  if (isPhotoDeleted) {
    return { phase: "success", isPhotoDeleted: true };
  }

  return { phase: "idle", isPhotoDeleted: false };
}
