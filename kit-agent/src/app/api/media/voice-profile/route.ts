import { NextResponse, type NextRequest } from "next/server";
import { Buffer } from "node:buffer";
import {
  analyzeVoiceSampleWithGemini,
  mockVoiceAnalysisForDemo,
} from "@/lib/media-persona/voice-gemini-analyze";
import { encryptVoiceProfilePayloadForClient } from "@/lib/media-persona/voice-response-ecdh-server";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 900_000;

interface Body {
  audioBase64?: string;
  mimeType?: string;
  /** P-256 ECDH 클라이언트 공개키(raw, base64). 있으면 Voice DNA JSON은 암호문으로만 반환합니다. */
  clientVoiceEcdhPublicKeyB64?: string;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const body = (await req.json()) as Body;
    const b64 = body.audioBase64?.trim();
    if (!b64) {
      return NextResponse.json(
        { error: "audioBase64가 필요합니다." },
        { status: 400 },
      );
    }

    const buf = Buffer.from(b64, "base64");
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "음성 파일이 너무 큽니다. 10초 이내 샘플을 사용해 주세요." },
        { status: 413 },
      );
    }

    const mimeType = body.mimeType?.trim() || "audio/webm";
    const clientKeyB64 = body.clientVoiceEcdhPublicKeyB64?.trim();
    if (!clientKeyB64) {
      return NextResponse.json(
        {
          error:
            "클라이언트 ECDH 공개키(clientVoiceEcdhPublicKeyB64)가 필요합니다. Voice DNA는 암호화된 응답으로만 제공됩니다.",
        },
        { status: 400 },
      );
    }
    let clientPub: Buffer;
    try {
      clientPub = Buffer.from(clientKeyB64, "base64");
    } catch {
      return NextResponse.json({ error: "공개키(base64) 형식이 올바르지 않습니다." }, { status: 400 });
    }
    if (clientPub.length !== 65 || clientPub[0] !== 0x04) {
      return NextResponse.json(
        { error: "ECDH 공개키는 P-256 비압축 raw(65바이트, 선행 0x04)여야 합니다." },
        { status: 400 },
      );
    }

    let analysis: ReturnType<typeof mockVoiceAnalysisForDemo>;
    let demo = false;

    if (!process.env.GOOGLE_API_KEY) {
      analysis = mockVoiceAnalysisForDemo();
      demo = true;
    } else {
      analysis = await analyzeVoiceSampleWithGemini({
        buffer: buf,
        mimeType,
        filename: "user-voice-sample",
      });
    }

    if (!analysis.ttsInstructionsEn.trim()) {
      buf.fill(0);
      return NextResponse.json(
        { error: "분석 결과가 비어 있습니다. 다시 녹음해 주세요." },
        { status: 422 },
      );
    }

    const payload = JSON.stringify({
      ttsInstructionsEn: analysis.ttsInstructionsEn,
      analysis,
    });

    buf.fill(0);

    let voiceCryptoEnvelope;
    try {
      voiceCryptoEnvelope = encryptVoiceProfilePayloadForClient(clientPub, payload);
    } catch {
      return NextResponse.json(
        { error: "응답 암호화에 실패했습니다. 클라이언트 키를 확인해 주세요." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      demo,
      voiceCryptoEnvelope,
      message: demo
        ? "GOOGLE_API_KEY가 없어 데모 분석 결과를 암호화해 반환했습니다."
        : undefined,
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : "voice-profile");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "음성 분석 오류" },
      { status: 500 },
    );
  }
}
