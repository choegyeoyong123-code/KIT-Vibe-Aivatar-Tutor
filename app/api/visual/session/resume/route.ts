import { NextResponse, type NextRequest } from "next/server";
import { Command, INTERRUPT, isInterrupted } from "@langchain/langgraph";
import { toVisualProblemSnapshot } from "@/lib/agent/visual-problem-snapshot";
import type { VisualProblemState } from "@/lib/agent/visual-problem-state";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  threadId: string;
  studentAnswer: string;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;
  try {
    const body = (await req.json()) as Body;
    if (!body.threadId) {
      return NextResponse.json(
        { error: "threadId가 필요합니다." },
        { status: 400 },
      );
    }
    const studentAnswer = (body.studentAnswer ?? "").trim();

    const { getCompiledVisualProblemGraph } = await import(
      "@/lib/agent/visual-problem-graph"
    );
    const graph = getCompiledVisualProblemGraph();
    const tid = `vprob-${body.threadId}`;
    const out = await graph.invoke(
      new Command({
        resume: { studentAnswer, at: new Date().toISOString() },
        update: { studentAnswer },
      }),
      { configurable: { thread_id: tid } },
    );

    if (isInterrupted(out)) {
      const snapshot = await graph.getState({
        configurable: { thread_id: tid },
      });
      return NextResponse.json({
        interrupted: true,
        threadId: body.threadId,
        state: toVisualProblemSnapshot(snapshot.values as VisualProblemState),
        interrupts: out[INTERRUPT],
      });
    }

    return NextResponse.json({
      interrupted: false,
      threadId: body.threadId,
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
