import { MEDIA_JOB_TTL_MS } from "@/lib/media-persona/constants";
import type {
  PersonaAnimationScript,
  TextToVideoPromptPack,
} from "@/lib/media-persona/types";
import type { MediaCostBreakdown } from "@/lib/media-persona/types";

export type MediaVoiceOutputMode = "persona" | "user";

export interface StoredMediaJob {
  script: PersonaAnimationScript;
  videoPrompts: TextToVideoPromptPack;
  costs: MediaCostBreakdown;
  hitlRequired: boolean;
  createdAt: number;
  /** Media Studio — TTS 출력 음색 */
  voiceOutputMode?: MediaVoiceOutputMode;
  /** Gemini 분석 → gpt-4o-mini-tts instructions */
  userVoiceTtsInstructions?: string | null;
}

const globalKey = "__kitMediaJobs";

function getMap(): Map<string, StoredMediaJob> {
  const g = globalThis as unknown as Record<string, Map<string, StoredMediaJob>>;
  if (!g[globalKey]) g[globalKey] = new Map();
  return g[globalKey];
}

export function saveMediaJob(id: string, job: StoredMediaJob): void {
  pruneJobs();
  getMap().set(id, job);
}

export function getMediaJob(id: string): StoredMediaJob | undefined {
  pruneJobs();
  return getMap().get(id);
}

export function deleteMediaJob(id: string): void {
  getMap().delete(id);
}

function pruneJobs(): void {
  const m = getMap();
  const now = Date.now();
  for (const [k, v] of m) {
    if (now - v.createdAt > MEDIA_JOB_TTL_MS) m.delete(k);
  }
}
