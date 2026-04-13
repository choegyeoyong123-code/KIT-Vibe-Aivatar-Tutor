import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { synthesizeHighFidelityTts } from "@/lib/media/hifi-tts";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

/** 요청 본문·Voice DNA는 로그에 남기지 않습니다(컴플라이언스). */

const VoiceDnaBody = z
  .object({
    speaking_rate: z.string().optional(),
    pitch_qualitative: z.string().optional(),
    tone_descriptors: z.array(z.string()).optional(),
    tts_instructions_en: z.string().optional(),
  })
  .optional();

const PostBody = z.object({
  text: z.string().min(1).max(5000),
  ssml: z.string().max(12000).optional(),
  voiceDna: VoiceDnaBody,
  prefer: z.enum(["elevenlabs", "openai"]).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const body = PostBody.parse(await req.json());
    const { buffer, mimeType, provider, demo } = await synthesizeHighFidelityTts({
      text: body.text,
      ssml: body.ssml ?? null,
      voiceDna: body.voiceDna ?? null,
      prefer: body.prefer,
    });

    const wipe = (b: Buffer) => {
      try {
        b.fill(0);
      } catch {
        /* ignore */
      }
    };

    if (!buffer.byteLength && demo) {
      wipe(buffer);
      return NextResponse.json({
        ok: true,
        demo: true,
        provider,
        audioBase64: null,
        mimeType,
        message:
          "TTS API 키가 없거나 합성에 실패했습니다. ELEVENLABS_API_KEY+ELEVENLABS_VOICE_ID 또는 OPENAI_API_KEY를 설정하세요.",
      });
    }

    const audioBase64 = buffer.toString("base64");
    wipe(buffer);

    return NextResponse.json({
      ok: true,
      demo,
      provider,
      mimeType,
      audioBase64,
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "tts-hifi");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TTS 합성 오류" },
      { status: 500 },
    );
  }
}
