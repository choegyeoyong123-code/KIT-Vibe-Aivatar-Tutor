import { randomUUID } from "crypto";
import { Buffer } from "node:buffer";
import type { EducationalPersonaId } from "@/constants/personas";
import { analyzeVisualGrounding } from "@/lib/vision/visual-grounding-service";
import { completeTextTracked } from "@/lib/agent/llm";
import { EDUCATIONAL_PERSONAS } from "@/constants/personas";

const KEY = "__kitStudioModalJobs";
const TTL_MS = 30 * 60 * 1000;

export type StudioModalJobStatus = "queued" | "processing" | "done" | "error";

export interface StudioModalJobRecord {
  id: string;
  status: StudioModalJobStatus;
  imageBase64: string;
  mimeType: string;
  filename: string;
  personaId: EducationalPersonaId;
  userInstruction: string;
  transcript?: string;
  groundingSummary?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

function map(): Map<string, StudioModalJobRecord> {
  const g = globalThis as unknown as Record<string, Map<string, StudioModalJobRecord>>;
  if (!g[KEY]) g[KEY] = new Map();
  return g[KEY];
}

function prune(): void {
  const m = map();
  const now = Date.now();
  for (const [k, v] of m) {
    if (now - v.createdAt > TTL_MS) m.delete(k);
  }
}

export function createStudioModalJob(input: Omit<StudioModalJobRecord, "updatedAt">): void {
  prune();
  map().set(input.id, { ...input, updatedAt: Date.now() });
}

export function getStudioModalJob(id: string): StudioModalJobRecord | undefined {
  prune();
  return map().get(id);
}

export function patchStudioModalJob(
  id: string,
  patch: Partial<StudioModalJobRecord>,
): StudioModalJobRecord | undefined {
  const cur = getStudioModalJob(id);
  if (!cur) return undefined;
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  map().set(id, next);
  return next;
}

const runPromises = new Map<string, Promise<void>>();

const STUDIO_SYSTEM = `You are a Korean creative learning media writer for coding students.
Write a short "rap-style" or rhythmic spoken script (not actual song lyrics with beat markers unless natural).
Structure: [Hook 2 lines] [Verse 6–12 lines] [Outro 1 line]. Use vivid but accurate imagery from the visual summary.
Stay classroom-appropriate. Output plain Korean text only — no JSON, no markdown fences.`;

async function executeStudioWork(id: string): Promise<void> {
  const job = getStudioModalJob(id);
  if (!job || job.status === "done" || job.status === "error") return;

  const buf = Buffer.from(job.imageBase64, "base64");
  const grounding = await analyzeVisualGrounding({
    buffer: buf,
    mimeType: job.mimeType,
    filename: job.filename,
  });

  const persona = EDUCATIONAL_PERSONAS.find((p) => p.id === job.personaId);
  const personaLine = persona
    ? `${persona.name} — ${persona.shortDescription}`
    : job.personaId;

  const user = [
    `페르소나 톤: ${personaLine}`,
    "",
    "시각 요약:",
    grounding.contextualSummary,
    "",
    "학생 요청:",
    job.userInstruction.trim() || "이 자료를 랩/스토리텔링 톤으로 재미있게 설명해 줘.",
  ].join("\n");

  const { text } = await completeTextTracked(STUDIO_SYSTEM, user, { tier: "economy" });

  const latest = getStudioModalJob(id);
  if (!latest || latest.status === "error" || latest.status === "done") return;

  patchStudioModalJob(id, {
    status: "done",
    transcript: text.trim(),
    groundingSummary: grounding.contextualSummary,
  });
}

/**
 * 첫 폴링에서 큐를 잡고, 이후 동시 요청은 동일 Promise를 공유합니다.
 */
export function ensureStudioModalJobRunning(id: string): Promise<void> {
  const job = getStudioModalJob(id);
  if (!job || job.status === "done" || job.status === "error") {
    return Promise.resolve();
  }

  let p = runPromises.get(id);
  if (!p) {
    p = (async () => {
      const j = getStudioModalJob(id);
      if (!j || j.status === "done" || j.status === "error") return;
      if (j.status === "queued") {
        patchStudioModalJob(id, { status: "processing" });
      }
      const j2 = getStudioModalJob(id);
      if (!j2 || j2.status !== "processing") return;
      try {
        await executeStudioWork(id);
      } catch (e) {
        const cur = getStudioModalJob(id);
        if (cur && cur.status !== "done") {
          patchStudioModalJob(id, {
            status: "error",
            error: e instanceof Error ? e.message : "미디어 작업 실패",
          });
        }
      }
    })().finally(() => {
      runPromises.delete(id);
    });
    runPromises.set(id, p);
  }
  return p;
}

export function newStudioModalJobId(): string {
  return randomUUID();
}
