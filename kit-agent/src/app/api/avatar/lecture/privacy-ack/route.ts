import { NextResponse, type NextRequest } from "next/server";
import {
  getAvatarLectureJob,
  saveAvatarLectureJob,
} from "@/lib/avatar/lecture-job-store";
import { createDeletionReceipt } from "@/lib/security/deletion-receipt-server";
import type { DeletedFileMetadata } from "@/lib/security/deletion-receipt";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

interface Body {
  jobId: string;
  deletedFileMetadata?: DeletedFileMetadata;
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
      deletedFileMetadata: body.deletedFileMetadata,
      deletionReceipt: createDeletionReceipt({
        contextId: jobId,
        fileMeta: {
          filename: body.deletedFileMetadata?.filename ?? "unknown",
          sizeBytes: body.deletedFileMetadata?.sizeBytes ?? 0,
          mimeType: body.deletedFileMetadata?.mimeType ?? "application/octet-stream",
          lastModifiedMs: body.deletedFileMetadata?.lastModifiedMs ?? 0,
          source: body.deletedFileMetadata?.source ?? "client-device",
        },
      }),
    });
    const updated = getAvatarLectureJob(jobId);
    return NextResponse.json({
      ok: true,
      jobId,
      userPhotoDeletionAcknowledged: true,
      security_check: "PASSED" as const,
      deletion_receipt: updated?.deletionReceipt ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
