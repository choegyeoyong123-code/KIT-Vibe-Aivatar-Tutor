import type { AvatarLectureJob } from "@/lib/avatar/types";

const KEY = "__kitAvatarLectureJobs";
const TTL_MS = 60 * 60 * 1000;

function map(): Map<string, AvatarLectureJob> {
  const g = globalThis as unknown as Record<string, Map<string, AvatarLectureJob>>;
  if (!g[KEY]) g[KEY] = new Map();
  return g[KEY];
}

export function saveAvatarLectureJob(id: string, job: AvatarLectureJob): void {
  prune();
  map().set(id, job);
}

export function getAvatarLectureJob(id: string): AvatarLectureJob | undefined {
  prune();
  return map().get(id);
}

export function deleteAvatarLectureJob(id: string): void {
  map().delete(id);
}

function prune(): void {
  const m = map();
  const now = Date.now();
  for (const [k, v] of m) {
    if (now - v.createdAt > TTL_MS) m.delete(k);
  }
}
