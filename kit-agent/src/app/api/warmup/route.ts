import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron 또는 수동 GET으로 서버리스 번들·그래프 초기화를 미리 당겨 콜드 스타트를 줄입니다.
 */
export async function GET() {
  try {
    await import("@/lib/bootstrap-env").then((m) => m.applyProviderEnvAliases());
    const { getCompiledLearningGraph } = await import("@/lib/agent/graph");
    getCompiledLearningGraph();
    await import("@/lib/agent/llm");
  } catch (e) {
    console.error("[warmup]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "warmup failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    message: "Graph + LLM 모듈 프리로드 완료",
  });
}
