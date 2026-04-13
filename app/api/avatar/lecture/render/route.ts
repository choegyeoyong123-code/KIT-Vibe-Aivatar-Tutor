import { NextResponse, type NextRequest } from "next/server";
import path from "path";
import { renderBackgroundPng, resolveBackgroundSpec } from "@/lib/avatar/background";
import { compositeLectureVideo } from "@/lib/avatar/composite-render";
import {
  deleteAvatarLectureJob,
  getAvatarLectureJob,
} from "@/lib/avatar/lecture-job-store";
import { renderLipSyncClip } from "@/lib/avatar/lipsync-render";
import { isAllowedPublicAsset, publicUrlToAbsolute } from "@/lib/avatar/paths";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { evaluateVideoFinalizeSecurityGate } from "@/lib/avatar/privacy-gate";
import { buildStaticStudyGuideMarkdown } from "@/lib/avatar/study-guide-fallback";
import type { AvatarLectureJob } from "@/lib/avatar/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  jobId: string;
  approved: boolean;
}

function studyGuideFallbackResponse(
  job: AvatarLectureJob,
  jobId: string,
  reason: string,
) {
  const studyGuideMarkdown = buildStaticStudyGuideMarkdown(job);
  return NextResponse.json({
    ok: true,
    status: "study_guide_fallback",
    jobId,
    studyGuideMarkdown,
    fallbackReason: reason,
    finalVideoUrl: null as string | null,
    lipSyncVideoUrl: null as string | null,
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "replicate");
  if (limited) return limited;

  let body: Body | null = null;
  try {
    body = (await req.json()) as Body;
    if (!body.jobId) {
      return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
    }

    const job = getAvatarLectureJob(body.jobId);
    if (!job) {
      return NextResponse.json(
        { error: "작업을 찾을 수 없거나 만료되었습니다." },
        { status: 404 },
      );
    }

    if (!body.approved) {
      deleteAvatarLectureJob(body.jobId);
      return NextResponse.json({ ok: false, status: "cancelled" });
    }

    if (!isAllowedPublicAsset(job.masterAvatarUrl) || !isAllowedPublicAsset(job.audioUrl)) {
      return NextResponse.json({ error: "잘못된 자산 경로" }, { status: 400 });
    }

    const gate = evaluateVideoFinalizeSecurityGate(job);
    if (gate.security_check !== "PASSED") {
      return NextResponse.json(
        {
          error: gate.reason,
          security_check: gate.security_check,
          video_generator_allowed_to_finalize: false,
        },
        { status: 403 },
      );
    }

    const routeBudget = Math.min(
      Number(process.env.AVATAR_RENDER_ROUTE_BUDGET_MS) > 0
        ? Number(process.env.AVATAR_RENDER_ROUTE_BUDGET_MS)
        : 280_000,
      295_000,
    );

    const runRender = async (): Promise<NextResponse> => {
      const masterAbs = publicUrlToAbsolute(job.masterAvatarUrl);
      const audioAbs = publicUrlToAbsolute(job.audioUrl);
      const publicBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

      const lipRel = `/avatar-output/${body!.jobId}/lip_sync.mp4`;
      const finalRel = `/avatar-output/${body!.jobId}/lecture_final.mp4`;
      const lipAbs = path.join(process.cwd(), "public", lipRel.replace(/^\//, ""));
      const finalAbs = path.join(process.cwd(), "public", finalRel.replace(/^\//, ""));

      const personaExtras = job.personaMediaHints?.wav2lipInputExtra;

      const { mode, userMessage: lipSyncUserMessage } = await renderLipSyncClip({
        masterImageAbs: masterAbs,
        audioAbs,
        outMp4Abs: lipAbs,
        masterPublicUrl: publicBase ? `${publicBase}${job.masterAvatarUrl}` : "",
        audioPublicUrl: publicBase ? `${publicBase}${job.audioUrl}` : "",
        ...(personaExtras && Object.keys(personaExtras).length
          ? { personaWav2lipExtras: personaExtras }
          : {}),
      });

      const spec = resolveBackgroundSpec(job.topicContext);
      const { absPath: bgAbs } = await renderBackgroundPng({
        jobId: body!.jobId,
        spec,
      });

      let finalUrl = finalRel;
      let compositeOk = true;
      try {
        compositeLectureVideo({
          backgroundAbs: bgAbs,
          avatarVideoAbs: lipAbs,
          outAbs: finalAbs,
        });
      } catch (compErr) {
        console.warn("배경 합성 실패, 립싱크 클립만 반환:", compErr);
        compositeOk = false;
        finalUrl = lipRel;
      }

      return NextResponse.json({
        ok: true,
        status: "completed",
        jobId: body!.jobId,
        lipSyncVideoUrl: lipRel,
        finalVideoUrl: finalUrl,
        compositeOk,
        lipSyncMode: mode,
        backgroundLabel: spec.label,
        ...(lipSyncUserMessage
          ? { avatarSynthesisUserMessage: lipSyncUserMessage }
          : {}),
        cfoMessage: `렌더 완료 (모드: ${mode}). 최종 추정 GPU 비용은 계획 시점의 $${job.estimatedLipSyncUsd.toFixed(2)}과 동일 스케일입니다.`,
      });
    };

    const renderPromise = runRender().catch((err) => {
      console.error(err);
      const reason =
        err instanceof Error ? err.message : String(err);
      return studyGuideFallbackResponse(
        job,
        body!.jobId,
        `합성 실패: ${reason} — 정적 학습 가이드로 대체합니다.`,
      );
    });

    const timeoutPromise = new Promise<NextResponse>((resolve) => {
      setTimeout(() => {
        resolve(
          studyGuideFallbackResponse(
            job,
            body!.jobId,
            `렌더 예산 초과(~${routeBudget}ms) — 플랫폼 504 대신 정적 학습 가이드를 반환합니다.`,
          ),
        );
      }, routeBudget);
    });

    return await Promise.race([renderPromise, timeoutPromise]);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "서버 오류";
    const jobId = body?.jobId;
    if (jobId) {
      const job = getAvatarLectureJob(jobId);
      if (job) {
        return studyGuideFallbackResponse(
          job,
          jobId,
          `요청 처리 오류: ${msg} — 정적 학습 가이드로 대체합니다.`,
        );
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
