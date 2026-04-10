import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { INTERRUPT, isInterrupted } from "@langchain/langgraph";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { ingestAgentMaterialsFromFormData } from "@/lib/agent/ingest-request-materials";
import { learningGraphInitialFields } from "@/lib/agent/initial-run-state";
import { parseLearningPersonaId } from "@/lib/agent/learning-persona";
import { parseStudentDisplayName } from "@/lib/agent/tutor-tone";
import {
  DEFAULT_DYNAMIC_PERSONA_ID,
  parseGalleryPersonaId,
} from "@/lib/agent/persona/persona-presets";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;
  try {
    const form = await req.formData();
    const rawThreadId = form.get("threadId");
    const threadId =
      typeof rawThreadId === "string" && rawThreadId.trim().length > 0
        ? rawThreadId.trim()
        : randomUUID();

    const sumRaw = form.get("summarizationInstruction");
    const summarizationInstruction =
      typeof sumRaw === "string" ? sumRaw.trim() : "";
    const learningPersona = parseLearningPersonaId(form.get("learningPersona"));
    const studentDisplayName = parseStudentDisplayName(form.get("studentName"));
    const galleryPersonaId =
      parseGalleryPersonaId(form.get("galleryPersonaId")) ??
      DEFAULT_DYNAMIC_PERSONA_ID;

    const ingested = await ingestAgentMaterialsFromFormData(form);
    if (!ingested.ok) {
      return NextResponse.json({ error: ingested.error }, { status: ingested.status });
    }

    const { getCompiledLearningGraph } = await import("@/lib/agent/graph");
    const graph = getCompiledLearningGraph();
    const state = await graph.invoke(
      {
        ...learningGraphInitialFields,
        originalMaterials: ingested.materials,
        summarizationInstruction,
        learningPersona,
        studentDisplayName,
        currentPersonaId: galleryPersonaId,
      },
      { configurable: { thread_id: threadId } },
    );

    if (isInterrupted(state)) {
      const snapshot = await graph.getState({
        configurable: { thread_id: threadId },
      });
      return NextResponse.json({
        interrupted: true,
        threadId,
        state: snapshot.values,
        interrupts: state[INTERRUPT],
      });
    }

    return NextResponse.json({ interrupted: false, threadId, state });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
