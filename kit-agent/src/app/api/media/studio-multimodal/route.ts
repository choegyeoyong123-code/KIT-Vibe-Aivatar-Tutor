import { NextResponse, type NextRequest } from "next/server";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  createStudioModalJob,
  ensureStudioModalJobRunning,
  getStudioModalJob,
  newStudioModalJobId,
} from "@/lib/media/studio-modal-job-store";
import type { EducationalPersonaId } from "@/constants/personas";
import { EDUCATIONAL_PERSONAS } from "@/constants/personas";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEMO_AUDIO_PATH = "/api/media/demo-chime";

const MAX_BYTES = 8 * 1024 * 1024;

function isPersonaId(v: string): v is EducationalPersonaId {
  return EDUCATIONAL_PERSONAS.some((p) => p.id === v);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const personaRaw =
      typeof form.get("personaId") === "string" ? (form.get("personaId") as string).trim() : "";
    const userInstruction =
      typeof form.get("userInstruction") === "string"
        ? (form.get("userInstruction") as string).trim()
        : "";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "파일이 너무 큽니다. (최대 8MB)" }, { status: 400 });
    }

    const personaId = personaRaw || "metaphor_mage";
    if (!isPersonaId(personaId)) {
      return NextResponse.json({ error: "유효하지 않은 페르소나입니다." }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 형식만 지원합니다." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const id = newStudioModalJobId();

    createStudioModalJob({
      id,
      status: "queued",
      imageBase64: buf.toString("base64"),
      mimeType: mime,
      filename: file.name || "upload.png",
      personaId,
      userInstruction,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      jobId: id,
      message:
        "백그라운드 스켈레톤: jobId로 상태를 조회하면 시각 분석 후 스크립트가 완성됩니다.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "요청 처리 실패" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  const jobId = req.nextUrl.searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
  }

  try {
    await ensureStudioModalJobRunning(jobId);
    const job = getStudioModalJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    if (job.status === "queued" || job.status === "processing") {
      return NextResponse.json({ status: job.status });
    }

    if (job.status === "error") {
      return NextResponse.json({ status: "error", error: job.error ?? "오류" });
    }

    return NextResponse.json({
      status: "done" as const,
      transcript: job.transcript ?? "",
      groundingSummary: job.groundingSummary ?? "",
      audioUrl: DEMO_AUDIO_PATH,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
