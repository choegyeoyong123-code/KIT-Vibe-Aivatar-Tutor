import { NextResponse, type NextRequest } from "next/server";
import { buildMetaCognitionVoiceScript } from "@/lib/visual-lab/meta-voice-script";
import { sanitizeUserPlaintextForLlm } from "@/lib/privacy/sanitize-for-llm";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      userWasCorrect?: boolean;
      quizSummary?: string;
      correctExplanation?: string;
      coreLogic?: string;
      userVoiceTtsInstructions?: string | null;
    };

    if (typeof body.userWasCorrect !== "boolean") {
      return NextResponse.json(
        { error: "userWasCorrect(boolean)가 필요합니다." },
        { status: 400 },
      );
    }

    const quizSummary = await sanitizeUserPlaintextForLlm(
      body.quizSummary?.trim() || "(요약 없음)",
    );
    const correctExplanation = await sanitizeUserPlaintextForLlm(
      body.correctExplanation?.trim() || "",
    );
    const coreLogic = await sanitizeUserPlaintextForLlm(body.coreLogic?.trim() || "");
    const userVoiceTtsInstructions =
      typeof body.userVoiceTtsInstructions === "string" &&
      body.userVoiceTtsInstructions.trim()
        ? await sanitizeUserPlaintextForLlm(body.userVoiceTtsInstructions.trim())
        : null;

    const { result, demo, modelId } = await buildMetaCognitionVoiceScript({
      userWasCorrect: body.userWasCorrect,
      quizSummary,
      correctExplanation,
      coreLogic,
      userVoiceTtsInstructions,
    });

    return NextResponse.json({
      ok: true,
      demo,
      modelId,
      script: result.script,
      estimatedSeconds: result.estimated_seconds,
      tone: result.tone,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "메타 음성 스크립트 오류" },
      { status: 500 },
    );
  }
}
