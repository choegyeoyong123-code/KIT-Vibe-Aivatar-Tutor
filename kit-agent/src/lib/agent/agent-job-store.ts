import type {
  ActiveModelTier,
  AgentAsyncJobStatus,
  MultimodalMaterial,
} from "@/lib/agent/types";
import type { LearningPersonaId } from "@/lib/agent/learning-persona";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";

const KEY = "__kitAgentAsyncJobs";
const TTL_MS = 45 * 60 * 1000;

export interface AgentAsyncJobRecord {
  id: string;
  threadId: string;
  status: AgentAsyncJobStatus;
  materials: MultimodalMaterial[];
  summarizationInstruction: string;
  learningPersona: LearningPersonaId;
  studentDisplayName: string;
  galleryPersonaId: DynamicPersonaId;
  /** 온보딩 교육 철학 systemPrompt (빈 문자열 가능; 구 작업 레코드는 생략될 수 있음) */
  educationalPersonaSystemPrompt?: string;
  activeModelTier?: ActiveModelTier;
  vendorModelId?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  state?: unknown;
  interrupts?: unknown;
}

function map(): Map<string, AgentAsyncJobRecord> {
  const g = globalThis as unknown as Record<string, Map<string, AgentAsyncJobRecord>>;
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

export function saveAgentAsyncJob(rec: AgentAsyncJobRecord): void {
  prune();
  map().set(rec.id, rec);
}

export function getAgentAsyncJob(id: string): AgentAsyncJobRecord | undefined {
  prune();
  return map().get(id);
}

export function patchAgentAsyncJob(
  id: string,
  patch: Partial<AgentAsyncJobRecord>,
): AgentAsyncJobRecord | undefined {
  const cur = getAgentAsyncJob(id);
  if (!cur) return undefined;
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  map().set(id, next);
  return next;
}

/** queued → running 단 한 번만 성공 (동시 after/수동 run 경쟁 방지) */
export function tryClaimAgentJob(id: string): boolean {
  const cur = getAgentAsyncJob(id);
  if (!cur || cur.status !== "queued") return false;
  map().set(id, { ...cur, status: "running", updatedAt: Date.now() });
  return true;
}
