import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { isInterrupted, INTERRUPT } from "@langchain/langgraph";
import { analyzeVisualGrounding } from "@/lib/vision/visual-grounding-service";
import type { CreativeIntent } from "@/lib/agent/creative/types";
import { toVisualProblemSnapshot } from "@/lib/agent/visual-problem-snapshot";
import type { VisualProblemState } from "@/lib/agent/visual-problem-state";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const INTENTS: CreativeIntent[] = ["quiz", "rap", "video_script"];

function parseIntent(raw: string | null): CreativeIntent {
  const s = (raw ?? "quiz").trim().toLowerCase();
  return INTENTS.includes(s as CreativeIntent) ? (s as CreativeIntent) : "quiz";
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "file 필드가 필요합니다." },
        { status: 400 },
      );
    }

    const threadId =
      (typeof form.get("threadId") === "string" && form.get("threadId")) ||
      randomUUID();
    const creativeIntent = parseIntent(
      typeof form.get("creativeIntent") === "string"
        ? (form.get("creativeIntent") as string)
        : null,
    );
    const userGoal =
      typeof form.get("userGoal") === "string"
        ? (form.get("userGoal") as string).trim()
        : "";
    const maxRaw = form.get("maxProblems");
    const maxProblems =
      typeof maxRaw === "string" && Number.isFinite(Number(maxRaw))
        ? Math.min(10, Math.max(1, Math.floor(Number(maxRaw))))
        : 3;

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "";
    const grounding = await analyzeVisualGrounding({
      buffer: buf,
      mimeType: mime,
      filename: file.name,
    });

    const { getCompiledVisualProblemGraph } = await import(
      "@/lib/agent/visual-problem-graph"
    );
    const graph = getCompiledVisualProblemGraph();
    const tid = `vprob-${threadId}`;
    const out = await graph.invoke(
      {
        filename: file.name,
        visualGrounding: grounding,
        creativeIntent,
        userGoal,
        maxProblems,
      },
      { configurable: { thread_id: tid } },
    );

    if (isInterrupted(out)) {
      const snapshot = await graph.getState({
        configurable: { thread_id: tid },
      });
      return NextResponse.json({
        interrupted: true,
        threadId,
        state: toVisualProblemSnapshot(snapshot.values as VisualProblemState),
        interrupts: out[INTERRUPT],
      });
    }

    return NextResponse.json({
      interrupted: false,
      threadId,
      state: toVisualProblemSnapshot(out as VisualProblemState),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
