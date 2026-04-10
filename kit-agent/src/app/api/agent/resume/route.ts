import { NextResponse, type NextRequest } from "next/server";
import { Command, INTERRUPT, isInterrupted } from "@langchain/langgraph";
import type { HitlResumeAction } from "@/lib/agent/types";
import { parseHitlResumeIntent } from "@/lib/agent/hitl/parse-exit-intent";
import { appendPolicyMemory } from "@/lib/policy/vector-store";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ResumeBody {
  threadId: string;
  action: HitlResumeAction;
  /** HITL 모달의 자연어 지시 */
  exitInstruction?: string;
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;
  try {
    const body = (await req.json()) as ResumeBody;
    if (!body.threadId || !body.action) {
      return NextResponse.json(
        { error: "threadId와 action이 필요합니다." },
        { status: 400 },
      );
    }

    const exitInstruction = body.exitInstruction?.trim() ?? "";
    const parsed = parseHitlResumeIntent({
      action: body.action,
      exitInstruction,
    });

    const update: Record<string, unknown> = {
      exitInstruction,
      terminationType: parsed.terminationType,
      hitlNextRoute: parsed.hitlNextRoute,
      pendingExitStrategy: parsed.pendingExitStrategy,
      hitlPending: false,
      interruptRequired: false,
      hitlBlockReasons: [],
      userPermissionStatus: "approved",
    };

    if (parsed.hitlNextRoute === "workflow") {
      update.pendingExitStrategy = null;
    }

    if (parsed.pendingExitStrategy === "model_downgrade") {
      update.activeModelTier = "economy";
    }

    const { getCompiledLearningGraph } = await import("@/lib/agent/graph");
    const graph = getCompiledLearningGraph();
    const result = await graph.invoke(
      new Command({
        resume: {
          action: body.action,
          at: new Date().toISOString(),
          exitInstruction,
          parsed,
        },
        update,
      }),
      { configurable: { thread_id: body.threadId } },
    );

    const recordPolicy = async (values: Record<string, unknown>) => {
      try {
        const cost = Number(values.accumulatedCost ?? 0);
        const loops = Number(values.loopCount ?? 0);
        await appendPolicyMemory({
          line: `action=${body.action};instruction=${exitInstruction};cost=${cost};loops=${loops}`,
          meta: {
            action: body.action,
            exitInstruction,
            accumulatedCost: cost,
            loopCount: loops,
            ts: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.warn("Policy memory append failed:", err);
      }
    };

    if (isInterrupted(result)) {
      const snapshot = await graph.getState({
        configurable: { thread_id: body.threadId },
      });
      const values = snapshot.values as Record<string, unknown>;
      await recordPolicy(values);
      return NextResponse.json({
        interrupted: true,
        threadId: body.threadId,
        state: snapshot.values,
        interrupts: result[INTERRUPT],
      });
    }

    await recordPolicy(result as Record<string, unknown>);
    return NextResponse.json({ interrupted: false, threadId: body.threadId, state: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
