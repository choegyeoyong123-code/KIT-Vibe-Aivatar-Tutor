import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const has = (k: string) => Boolean(process.env[k]?.trim());

/**
 * 에이전틱 서브서비스 구성 상태(키 존재 여부). 값은 절대 반환하지 않습니다.
 * 무거운 외부 ping은 하지 않습니다 — 배포 직후 / 심사 환경에서 빠른 green 체크용.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const probe = url.searchParams.get("probe") === "1";

  const services = {
    gemini: has("GOOGLE_API_KEY") || has("GEMINI_API_KEY"),
    openai: has("OPENAI_API_KEY"),
    anthropic: has("ANTHROPIC_API_KEY") || has("CLAUDE_API_KEY"),
    elevenlabs: has("ELEVENLABS_API_KEY") && has("ELEVENLABS_VOICE_ID"),
    upstashRateLimit: has("UPSTASH_REDIS_REST_URL") && has("UPSTASH_REDIS_REST_TOKEN"),
    replicate: has("REPLICATE_API_TOKEN") || has("REPLICATE_API_KEY"),
    piiLlmGuard: process.env.PII_LLM_GUARD === "1",
  };

  let edgeOrchestrator: { ok: boolean } | null = null;
  if (probe) {
    try {
      const origin = url.origin;
      const r = await fetch(`${origin}/api/orchestrator/status`, {
        next: { revalidate: 0 },
      });
      edgeOrchestrator = { ok: r.ok };
    } catch {
      edgeOrchestrator = { ok: false };
    }
  }

  const readyCore = services.gemini || services.openai;
  const status = readyCore ? 200 : 503;

  return NextResponse.json(
    {
      ok: readyCore,
      at: new Date().toISOString(),
      runtime: "nodejs",
      services,
      ...(probe ? { edgeOrchestrator } : {}),
      links: {
        edgePulse: "/api/orchestrator/status",
        warmup: "/api/warmup",
      },
    },
    { status },
  );
}
