import type {
  PersonaAnimationScript,
  TextToVideoPromptPack,
  TextToVideoScenePrompt,
} from "@/lib/media-persona/types";

function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function num(o: Record<string, unknown>, keys: string[], d: number): number {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && Number.isFinite(Number(v))) return Number(v);
  }
  return d;
}

function normalizeScene(
  raw: unknown,
  fallbackId: string,
): TextToVideoScenePrompt | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const prompt = pickStr(o, [
    "text_to_video_prompt",
    "textToVideoPrompt",
    "prompt",
  ]);
  if (!prompt) return null;
  return {
    scene_id: pickStr(o, ["scene_id", "sceneId"]) || fallbackId,
    text_to_video_prompt: prompt,
    negative_prompt: pickStr(o, ["negative_prompt", "negativePrompt"]),
    suggested_duration_sec: num(o, ["suggested_duration_sec", "duration_sec"], 6),
    camera_notes: pickStr(o, ["camera_notes", "cameraNotes"]),
    lighting_notes: pickStr(o, ["lighting_notes", "lightingNotes"]),
    character_consistency_tokens: pickStr(o, [
      "character_consistency_tokens",
      "characterConsistencyTokens",
    ]),
    style_lock: pickStr(o, ["style_lock", "styleLock"]),
  };
}

export function parseTextToVideoPack(
  raw: string,
  script: PersonaAnimationScript,
): TextToVideoPromptPack {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const p = JSON.parse(cleaned) as Record<string, unknown>;
    const scenesRaw = p.scenes ?? p.Scenes;
    const scenes: TextToVideoScenePrompt[] = [];
    if (Array.isArray(scenesRaw)) {
      scenesRaw.forEach((s, i) => {
        const sid = script.scenes[i]?.scene_id ?? `scene_${i + 1}`;
        const n = normalizeScene(s, sid);
        if (n) scenes.push(n);
      });
    }
    return {
      model_hints: pickStr(p, ["model_hints", "modelHints"]),
      global_style_bible: pickStr(p, [
        "global_style_bible",
        "globalStyleBible",
      ]),
      scenes,
    };
  } catch {
    return {
      model_hints: "Google Veo / OpenAI Sora class models — 720p+, 24fps",
      global_style_bible: "",
      scenes: [],
    };
  }
}
