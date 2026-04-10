import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { cosineSimilarity, embedTexts } from "@/lib/agent/embeddings/embed";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "kit-policy-memory.json");
const MAX_ENTRIES = 120;

export interface PolicyMemoryEntry {
  id: string;
  vector: number[];
  line: string;
  meta: {
    action?: string;
    exitInstruction?: string;
    accumulatedCost?: number;
    loopCount?: number;
    ts: string;
  };
}

async function loadAll(): Promise<PolicyMemoryEntry[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as PolicyMemoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAll(entries: PolicyMemoryEntry[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 0), "utf-8");
}

export async function appendPolicyMemory(input: {
  line: string;
  meta: PolicyMemoryEntry["meta"];
}): Promise<void> {
  const [vector] = await embedTexts([input.line]);
  const entries = await loadAll();
  entries.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    vector,
    line: input.line,
    meta: { ...input.meta, ts: input.meta.ts ?? new Date().toISOString() },
  });
  await saveAll(entries);
}

export async function searchSimilarPolicy(
  queryLine: string,
): Promise<{ score: number; entry: PolicyMemoryEntry } | null> {
  const [qv] = await embedTexts([queryLine]);
  const entries = await loadAll();
  if (!entries.length) return null;
  let best: { score: number; entry: PolicyMemoryEntry } | null = null;
  for (const e of entries) {
    if (e.vector.length !== qv.length) continue;
    const s = cosineSimilarity(qv, e.vector);
    if (!best || s > best.score) best = { score: s, entry: e };
  }
  if (!best || best.score < 0.32) return null;
  return best;
}
