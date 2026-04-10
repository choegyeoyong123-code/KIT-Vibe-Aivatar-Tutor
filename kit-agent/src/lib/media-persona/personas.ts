import type { PersonaId } from "@/lib/media-persona/types";

export const PERSONA_VISUAL_STYLE: Record<PersonaId, string> = {
  "shin-chan":
    "1990s Japanese TV cel animation, thick black outlines, flat saturated colors, simple suburban interiors and museum exhibit halls, comedic timing, chibi-adjacent proportions, film grain subtle, educational overlay text optional",
  "neutral-educator":
    "Clean modern explainer motion-graphics, soft gradients, isometric diagrams, museum lighting, accurate proportions, PBS-style educational documentary",
};

export function personaScriptBible(personaId: PersonaId): string {
  if (personaId === "shin-chan") {
    return [
      "You write dialogue for a mischievous 5-year-old boy persona inspired by Crayon Shin-chan.",
      "Speech tics (mix naturally, do not overuse every line): interjections like \"헤에~!\", \"미스터~\", \"짱이야~\", \"그런 거 아냐?\", playful whining, sudden blunt honesty.",
      "Stay factually tied to KNOWLEDGE_MASTER_CONTEXT — if the source does not name a detail, do not invent it.",
      "Tone: cheeky but respectful; classroom-safe; Korean primary with occasional playful English nicknames (e.g. \"Mister~\") when it fits.",
      "Each scene: one clear teaching beat from the context (e.g. historical artifact facts like the royal tomb 무령왕릉/무영총 when present in context).",
    ].join("\n");
  }
  return [
    "Neutral educator narrator: clear, warm, age-flexible Korean.",
    "Anchor every line to KNOWLEDGE_MASTER_CONTEXT; no fabricated dates or names.",
    "Scenes should build logically: setup → evidence → takeaway.",
  ].join("\n");
}
