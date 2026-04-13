import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Edge 오케스트레이터 펄스 — TTFB 최소화.
 * 비밀 값은 노출하지 않고, 구성 가능 여부만 boolean으로 반환합니다.
 */
export async function GET() {
  const has = (k: string) => Boolean(process.env[k]?.trim());

  return NextResponse.json({
    ok: true,
    edge: true,
    region: "orchestrator-pulse",
    at: new Date().toISOString(),
    agents: {
      gemini: has("GOOGLE_API_KEY") || has("GEMINI_API_KEY"),
      openai: has("OPENAI_API_KEY"),
      anthropic: has("ANTHROPIC_API_KEY") || has("CLAUDE_API_KEY"),
      elevenlabs: has("ELEVENLABS_API_KEY") && has("ELEVENLABS_VOICE_ID"),
      piiLlmGuard: process.env.PII_LLM_GUARD === "1",
    },
    hints: {
      deepHealth: "/api/health",
      warmup: "/api/warmup",
    },
  });
}
