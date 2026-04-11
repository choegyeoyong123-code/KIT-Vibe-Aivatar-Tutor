import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
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
import { parseEducationalPersonaSystemPrompt } from "@/lib/agent/educational-persona-prompt";
import { mergeModelSelectionFromForm } from "@/lib/agent/merge-run-form-model";
import { distillStreamContext } from "@/lib/agent/distill-stream-context";
import { pickOrchestratorLine } from "@/lib/agent/orchestrator-lines";

export const runtime = "nodejs";
export const maxDuration = 120;

type NdjsonEvent =
  | { type: "orchestrator"; message: string }
  | { type: "ingest"; fileCount: number; kinds: string[] }
  | { type: "summary"; delta: string }
  | {
      type: "done";
      interrupted: boolean;
      threadId: string;
      state: unknown;
      interrupts?: unknown;
    }
  | { type: "error"; message: string };

function encodeLine(ev: NdjsonEvent, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`${JSON.stringify(ev)}\n`);
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (ev: NdjsonEvent) => {
        controller.enqueue(encodeLine(ev, encoder));
      };

      let orchTick = 0;
      const interval = setInterval(() => {
        orchTick += 1;
        push({ type: "orchestrator", message: pickOrchestratorLine(orchTick) });
      }, 1400);

      try {
        push({ type: "orchestrator", message: pickOrchestratorLine(0) });

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
          clearInterval(interval);
          push({ type: "error", message: ingested.error });
          controller.close();
          return;
        }

        const kinds = ingested.materials.map((m) => m.kind);
        push({
          type: "ingest",
          fileCount: ingested.materials.length,
          kinds,
        });

        const { getCompiledLearningGraph } = await import("@/lib/agent/graph");
        const graph = getCompiledLearningGraph();
        const state = await distillStreamContext.run(
          {
            onSummaryDelta: (delta) => {
              if (delta) push({ type: "summary", delta });
            },
          },
          () =>
            graph.invoke(
              {
                ...learningGraphInitialFields,
                originalMaterials: ingested.materials,
                summarizationInstruction,
                learningPersona,
                studentDisplayName,
                currentPersonaId: galleryPersonaId,
                educationalPersonaSystemPrompt,
                activeModelTier,
                vendorModelId,
              },
              { configurable: { thread_id: threadId } },
            ),
        );

        clearInterval(interval);

        if (isInterrupted(state)) {
          const snapshot = await graph.getState({
            configurable: { thread_id: threadId },
          });
          push({
            type: "done",
            interrupted: true,
            threadId,
            state: snapshot.values,
            interrupts: state[INTERRUPT],
          });
        } else {
          push({
            type: "done",
            interrupted: false,
            threadId,
            state,
          });
        }
      } catch (e) {
        clearInterval(interval);
        console.error(e);
        push({
          type: "error",
          message: e instanceof Error ? e.message : "서버 오류",
        });
      } finally {
        clearInterval(interval);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
