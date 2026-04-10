import type { AvatarLectureJob } from "@/lib/avatar/types";

export type SecurityCheckStatus = "PASSED" | "BLOCKED";

export type VideoGeneratorGateResult = {
  security_check: SecurityCheckStatus;
  /** When BLOCKED, HTTP 403 body / operator diagnostics */
  reason: string;
};

/**
 * Security_Guardian gate (deterministic). When `KIT_SECURITY_GATE_STRICT=1`,
 * Video_Generator finalization is blocked until the client acknowledges user
 * photo deletion (Privacy Protocol).
 */
export function evaluateVideoFinalizeSecurityGate(
  job: AvatarLectureJob,
): VideoGeneratorGateResult {
  const strict = process.env.KIT_SECURITY_GATE_STRICT === "1";
  if (!strict) {
    return { security_check: "PASSED", reason: "strict_gate_disabled" };
  }
  if (job.userPhotoDeletionAcknowledged === true) {
    return { security_check: "PASSED", reason: "user_photo_deletion_acknowledged" };
  }
  return {
    security_check: "BLOCKED",
    reason:
      "User Photo Deletion not confirmed. Client MUST POST /api/avatar/lecture/privacy-ack with { jobId } before render.",
  };
}
