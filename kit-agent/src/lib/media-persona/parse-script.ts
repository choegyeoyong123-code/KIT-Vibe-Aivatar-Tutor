import type {
  PersonaAnimationScene,
  PersonaAnimationScript,
  PersonaId,
} from "@/lib/media-persona/types";

function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeScene(raw: unknown, idx: number): PersonaAnimationScene | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const dialogue = pickStr(o, ["dialogue", "Dialogue"]);
  const desc = pickStr(o, [
    "scene_description",
    "Scene_Description",
    "sceneDescription",
  ]);
  const cues = pickStr(o, [
    "character_action_cues",
    "Character_Action_Cues",
    "characterActionCues",
  ]);
  const id = pickStr(o, ["scene_id", "sceneId"]) || `scene_${idx + 1}`;
  if (!desc && !dialogue) return null;
  return {
    scene_id: id,
    scene_description: desc || "(설명 없음)",
    dialogue: dialogue || "(대사 없음)",
    character_action_cues: cues || "",
  };
}

export function parsePersonaAnimationScript(
  raw: string,
  fallbackPersona: PersonaId,
): PersonaAnimationScript {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const p = JSON.parse(cleaned) as Record<string, unknown>;
    const pid = pickStr(p, ["persona_id", "personaId"]) as PersonaId;
    const persona_id =
      pid === "shin-chan" || pid === "neutral-educator"
        ? pid
        : fallbackPersona;
    const scenesRaw = p.scenes ?? p.Scenes;
    const scenes: PersonaAnimationScene[] = [];
    if (Array.isArray(scenesRaw)) {
      scenesRaw.forEach((s, i) => {
        const n = normalizeScene(s, i);
        if (n) scenes.push(n);
      });
    }
    return {
      persona_id,
      title: pickStr(p, ["title", "Title"]) || "교육 애니메이션 스크립트",
      educational_topic:
        pickStr(p, ["educational_topic", "educationalTopic", "Educational_Topic"]) ||
        "KIT 강의 주제",
      scenes,
    };
  } catch {
    return {
      persona_id: fallbackPersona,
      title: "파싱 실패",
      educational_topic: "",
      scenes: [],
    };
  }
}
