import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { applyProviderEnvAliases } from "@/lib/bootstrap-env";
import { applyRegexPiiMask } from "@/lib/privacy/pii-regex";
import { llmRedactResidualPii } from "@/lib/privacy/pii-llm-redact";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  text: z.string().min(1).max(12_000),
  /** true면 서버에서 PII_LLM_GUARD와 동일하게 LLM 2차 적용 */
  useLlm: z.boolean().optional(),
});

/**
 * 클라이언트가 AI로 보내기 전 2차 검사용. 요청 본문은 로그하지 않습니다.
 */
export async function POST(req: NextRequest) {
  applyProviderEnvAliases();
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const { text, useLlm } = Body.parse(await req.json());
    const { text: rx, replacements: rxCount } = applyRegexPiiMask(text);
    const wantLlm = Boolean(useLlm) || process.env.PII_LLM_GUARD === "1";
    const sanitized = wantLlm ? await llmRedactResidualPii(rx, { force: true }) : rx;
    const hasGeminiKey = Boolean(
      process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim(),
    );
    return NextResponse.json({
      ok: true,
      sanitized,
      regexHits: rxCount,
      llmApplied: wantLlm && hasGeminiKey,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "pii-scan 실패" },
      { status: 400 },
    );
  }
}
