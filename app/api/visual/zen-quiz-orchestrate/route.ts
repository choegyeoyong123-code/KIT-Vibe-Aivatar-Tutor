import { NextResponse, type NextRequest } from "next/server";
import { LogicGraphJsonSchema } from "@/lib/visual-lab/logic-graph-schema";
import { orchestrateZenQuizPipeline } from "@/lib/visual-lab/orchestrate-zen-quiz";
import { sanitizeUserPlaintextForLlm } from "@/lib/privacy/sanitize-for-llm";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      logic?: unknown;
      personaAnalogySeed?: string;
    };
    const rawLogic = LogicGraphJsonSchema.parse(body.logic);
    const core_logic = await sanitizeUserPlaintextForLlm(rawLogic.core_logic);
    const key_entities = await Promise.all(
      rawLogic.key_entities.map(async (e) => ({
        ...e,
        name: await sanitizeUserPlaintextForLlm(e.name),
        role: await sanitizeUserPlaintextForLlm(e.role),
        detail: e.detail ? await sanitizeUserPlaintextForLlm(e.detail) : undefined,
      })),
    );
    const logic_gaps = await Promise.all(
      rawLogic.logic_gaps.map(async (g) => ({
        ...g,
        gap: await sanitizeUserPlaintextForLlm(g.gap),
        severity: g.severity ? await sanitizeUserPlaintextForLlm(g.severity) : undefined,
      })),
    );
    const logic = { ...rawLogic, core_logic, key_entities, logic_gaps };

    const personaAnalogySeed = body.personaAnalogySeed?.trim()
      ? await sanitizeUserPlaintextForLlm(body.personaAnalogySeed.trim())
      : undefined;

    const out = await orchestrateZenQuizPipeline({
      logic,
      personaAnalogySeed,
    });

    if (!out.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: out.reason,
          lastDebate: out.lastDebate,
          attempts: out.attempts,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      pack: out.pack,
      debate: out.debate,
      attempts: out.attempts,
      demo: out.demo,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Zen 퀴즈 오케스트레이션 오류" },
      { status: 500 },
    );
  }
}
