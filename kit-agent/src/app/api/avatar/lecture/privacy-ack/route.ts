import { NextResponse, type NextRequest } from "next/server";
import {
  getAvatarLectureJob,
  saveAvatarLectureJob,
} from "@/lib/avatar/lecture-job-store";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

interface Body {
  jobId: string;
}

/**
 * Client confirms Privacy Protocol — user source photo deleted from device.
 * Required before `/api/avatar/lecture/render` when `KIT_SECURITY_GATE_STRICT=1`.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "standard");
  if (limited) return limited;
  try {
    const body = (await req.json()) as Body;
    const jobId = (body.jobId ?? "").trim();
    if (!jobId) {
      return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
    }
    const job = getAvatarLectureJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없거나 만료되었습니다." },
        { status: 404 },
      );
    }
    saveAvatarLectureJob(jobId, {
      ...job,
      userPhotoDeletionAcknowledged: true,
    });
    return NextResponse.json({
      ok: true,
      jobId,
      userPhotoDeletionAcknowledged: true,
      security_check: "PASSED" as const,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
