import { randomUUID } from "crypto";
import { after } from "next/server";
import { NextResponse, type NextRequest } from "next/server";
import { saveAgentAsyncJob, tryClaimAgentJob } from "@/lib/agent/agent-job-store";
import { executeAgentAsyncJob } from "@/lib/agent/execute-agent-async-job";
import { ingestAgentMaterialsFromFormData } from "@/lib/agent/ingest-request-materials";
import { parseLearningPersonaId } from "@/lib/agent/learning-persona";
import { parseStudentDisplayName } from "@/lib/agent/tutor-tone";
import {
  DEFAULT_DYNAMIC_PERSONA_ID,
  parseGalleryPersonaId,
} from "@/lib/agent/persona/persona-presets";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { parseEducationalPersonaSystemPrompt } from "@/lib/agent/educational-persona-prompt";
import { mergeModelSelectionFromForm } from "@/lib/agent/merge-run-form-model";

export const runtime = "nodejs";
/** Strategy 11: 업로드·검증만 수행 — 본 실행은 after() 또는 /jobs/[id]/run */
export const maxDuration = 10;

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
    const educationalPersonaSystemPrompt = parseEducationalPersonaSystemPrompt(
      form.get("educationalPersonaSystemPrompt"),
    );
    const { vendorModelId, activeModelTier } = mergeModelSelectionFromForm(form);

    const ingested = await ingestAgentMaterialsFromFormData(form);
    if (!ingested.ok) {
      return NextResponse.json({ error: ingested.error }, { status: ingested.status });
    }

    const jobId = randomUUID();
    saveAgentAsyncJob({
      id: jobId,
      threadId,
      status: "queued",
      materials: ingested.materials,
      summarizationInstruction,
      learningPersona,
      studentDisplayName,
      galleryPersonaId,
      educationalPersonaSystemPrompt,
      activeModelTier,
      vendorModelId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    after(async () => {
      if (!tryClaimAgentJob(jobId)) return;
      await executeAgentAsyncJob(jobId);
    });

    return NextResponse.json(
      {
        jobId,
        threadId,
        status: "queued" as const,
        pollUrl: `/api/agent/jobs/${jobId}`,
        hint:
          "Poll GET until status is completed | failed | interrupted. On Vercel Free, if work never starts, POST /api/agent/jobs/{jobId}/run once (longer maxDuration).",
      },
      { status: 202 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
