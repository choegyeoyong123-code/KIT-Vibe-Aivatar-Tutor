import { NextResponse, type NextRequest } from "next/server";
import { RaceAudioRequestSchema } from "@/lib/visual-lab/race-audio-schema";
import { synthesizeRaceChainedAudioScript } from "@/lib/visual-lab/race-chained-audio-script";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * RACE 체인: Visual Lab Logic JSON + Analyzer Voice DNA → 1인칭 SSML 오디오 스크립트 (~30초).
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const body = RaceAudioRequestSchema.parse(await req.json());
    const { result, demo, modelId } = await synthesizeRaceChainedAudioScript({
      logic: body.logic,
      voiceDna: body.voice_dna,
      personaId: body.persona_id,
      content: body.content,
    });

    return NextResponse.json({
      ok: true,
      demo,
      modelId,
      ssml_script: result.ssml_script,
      plain_script_ko: result.plain_script_ko,
      estimated_seconds: result.estimated_seconds,
      race_trace: result.race_trace ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "RACE audio script 오류" },
      { status: 500 },
    );
  }
}
