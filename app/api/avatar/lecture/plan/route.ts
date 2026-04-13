import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import {
  estimateLipSyncJobUsd,
  shouldRequireLipSyncHitl,
} from "@/lib/avatar/lipsync-cfo";
import { saveAvatarLectureJob } from "@/lib/avatar/lecture-job-store";
import { isAllowedPublicAsset, publicUrlToAbsolute } from "@/lib/avatar/paths";
import { probeAudioDurationSec } from "@/lib/avatar/audio-probe";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";
import type { DistilledData } from "@/lib/agent/types";
import {
  getPersonaMediaProfile,
  isDynamicPersonaId,
} from "@/lib/agent/persona/persona-presets";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  masterAvatarUrl: string;
  audioUrl: string;
  topicContext: string;
  durationSec?: number;
  /** Strategy 9: 비디오 폴백 시 우선 사용 */
  studyGuideMarkdown?: string;
  distilledData?: DistilledData;
  /** Persona_Manager와 정합된 립싱크·TTS 힌트 */
  kitPersonaId?: string;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "standard");
  if (limited) return limited;
  try {
    const body = (await req.json()) as Body;
    const masterAvatarUrl = (body.masterAvatarUrl ?? "").trim();
    const audioUrl = (body.audioUrl ?? "").trim();
    const topicContext = (body.topicContext ?? "").trim() || "KIT 학습 콘텐츠";

    if (!masterAvatarUrl || !audioUrl) {
      return NextResponse.json(
        { error: "masterAvatarUrl과 audioUrl이 필요합니다." },
        { status: 400 },
      );
    }
    if (!isAllowedPublicAsset(masterAvatarUrl) || !isAllowedPublicAsset(audioUrl)) {
      return NextResponse.json(
        { error: "허용되지 않은 자산 경로입니다." },
        { status: 400 },
      );
    }

    const audioAbs = publicUrlToAbsolute(audioUrl);
    const durationSec =
      typeof body.durationSec === "number" && body.durationSec > 0
        ? body.durationSec
        : probeAudioDurationSec(audioAbs) ?? 60;

    const estimatedLipSyncUsd = estimateLipSyncJobUsd(durationSec);
    const hitlRequired = shouldRequireLipSyncHitl(estimatedLipSyncUsd);
    const jobId = randomUUID();

    const studyGuideMarkdown =
      typeof body.studyGuideMarkdown === "string"
        ? body.studyGuideMarkdown.trim()
        : undefined;
    const distilledData =
      body.distilledData &&
      typeof body.distilledData === "object" &&
      !Array.isArray(body.distilledData)
        ? (body.distilledData as DistilledData)
        : undefined;

    const rawPersona =
      typeof body.kitPersonaId === "string" ? body.kitPersonaId.trim() : "";
    const kitPersonaId =
      rawPersona && isDynamicPersonaId(rawPersona) ? rawPersona : undefined;
    const personaMediaHints =
      kitPersonaId != null ? getPersonaMediaProfile(kitPersonaId) : undefined;

    saveAvatarLectureJob(jobId, {
      masterAvatarUrl,
      audioUrl,
      topicContext,
      durationSec,
      estimatedLipSyncUsd,
      hitlRequired,
      createdAt: Date.now(),
      userPhotoDeletionAcknowledged: false,
      ...(studyGuideMarkdown ? { studyGuideMarkdown } : {}),
      ...(distilledData ? { distilledData } : {}),
      ...(kitPersonaId && personaMediaHints
        ? { kitPersonaId, personaMediaHints }
        : {}),
    });

    const privacyGateRequired = process.env.KIT_SECURITY_GATE_STRICT === "1";

    return NextResponse.json({
      jobId,
      durationSec,
      estimatedLipSyncUsd,
      hitlRequired,
      kitPersonaId: kitPersonaId ?? null,
      ttsHints: personaMediaHints
        ? {
            speed: personaMediaHints.ttsSpeed,
            rhythmPauses: personaMediaHints.rhythmPauses,
            voiceCharacter: personaMediaHints.voiceCharacter,
          }
        : null,
      cfoMessage: hitlRequired
        ? `CFO: 립싱크·디지털 휴먼 추정 비용 $${estimatedLipSyncUsd.toFixed(2)}이 한도 $${process.env.AVATAR_LIPSYNC_APPROVAL_USD ?? "2"} USD를 초과합니다. 승인 후 /api/avatar/lecture/render 를 호출하세요.`
        : `추정 $${estimatedLipSyncUsd.toFixed(2)} — 한도 이하로 바로 렌더 가능합니다.`,
      privacyGateRequired,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
