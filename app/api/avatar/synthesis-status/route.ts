import { NextResponse, type NextRequest } from "next/server";
import {
  AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE,
  isMasterAvatarReplicateConfigured,
  isWav2lipReplicateConfigured,
} from "@/lib/avatar/replicate-config";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/** Replicate 아바타·립싱크 설정 여부 (키 값은 노출하지 않음) */
export async function GET(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "standard");
  if (limited) return limited;
  const masterReady = isMasterAvatarReplicateConfigured();
  const lipReady = isWav2lipReplicateConfigured();
  return NextResponse.json({
    masterAvatarReplicateReady: masterReady,
    wav2lipReplicateReady: lipReady,
    unavailableMessage: AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE,
    summary:
      masterReady && lipReady
        ? "Replicate 마스터 아바타 및 립싱크가 구성되어 있습니다."
        : "Replicate가 일부 또는 전부 비활성입니다. 로컬 폴백이 사용될 수 있습니다.",
  });
}
