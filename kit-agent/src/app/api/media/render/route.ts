import { NextResponse, type NextRequest } from "next/server";
import { deleteMediaJob, getMediaJob } from "@/lib/media-persona/job-store";
import { runMediaRenderPipeline } from "@/lib/media-persona/render-pipeline";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  jobId: string;
  approved: boolean;
  voiceOutputMode?: "persona" | "user";
  userVoiceTtsInstructions?: string | null;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "media_render");
  if (limited) return limited;
  try {
    const body = (await req.json()) as Body;
    if (!body.jobId) {
      return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
    }

    const job = getMediaJob(body.jobId);
    if (!job) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없거나 만료되었습니다." },
        { status: 404 },
      );
    }

    if (!body.approved) {
      deleteMediaJob(body.jobId);
      return NextResponse.json({
        ok: false,
        status: "cancelled",
        message: "사용자가 렌더를 거절했습니다.",
      });
    }

    const mode =
      body.voiceOutputMode === "user"
        ? "user"
        : (job.voiceOutputMode ?? "persona");
    const instructionsFromBody =
      typeof body.userVoiceTtsInstructions === "string"
        ? body.userVoiceTtsInstructions.trim() || null
        : undefined;
    const userVoiceTtsInstructions =
      instructionsFromBody !== undefined
        ? instructionsFromBody
        : job.userVoiceTtsInstructions ?? null;

    if (mode === "user" && !userVoiceTtsInstructions) {
      return NextResponse.json(
        {
          error:
            "내 목소리 모드에서는 학습된 음성 지침이 필요합니다. Media Studio에서 음성을 등록한 뒤 다시 시도하세요.",
        },
        { status: 400 },
      );
    }

    const render = await runMediaRenderPipeline({
      jobId: body.jobId,
      script: job.script,
      userVoiceTtsInstructions:
        mode === "user" ? userVoiceTtsInstructions : null,
    });

    return NextResponse.json({
      ok: true,
      status: "rendered",
      jobId: body.jobId,
      costs: job.costs,
      render,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
