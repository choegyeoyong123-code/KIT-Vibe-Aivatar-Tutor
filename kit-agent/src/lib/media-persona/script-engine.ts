import { completeTextTracked } from "@/lib/agent/llm";
import { usdCostForTokens } from "@/lib/agent/pricing";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";
import { parsePersonaAnimationScript } from "@/lib/media-persona/parse-script";
import { personaScriptBible } from "@/lib/media-persona/personas";
import type { PersonaAnimationScript, PersonaId } from "@/lib/media-persona/types";

const SCRIPT_SYSTEM = `PERSONA_ANIMATION_SCRIPT_V1
You are a creative screenwriter for educational animation.
Return JSON only (no markdown fences) with this exact shape:
{
  "persona_id": "shin-chan" | "neutral-educator",
  "title": "string",
  "educational_topic": "string",
  "scenes": [
    {
      "scene_id": "string",
      "scene_description": "string (visual setting / shot intent)",
      "dialogue": "string (spoken lines)",
      "character_action_cues": "string (blocking, gestures, props)"
    }
  ]
}
Use 4–7 scenes unless the context is very short.`;

export async function generatePersonaAnimationScript(input: {
  masterContext: string;
  personaId: PersonaId;
  extraInstruction?: string;
}): Promise<{
  script: PersonaAnimationScript;
  usage: LlmUsageRecord;
  llmUsd: number;
}> {
  const bible = personaScriptBible(input.personaId);
  const user = [
    "## KNOWLEDGE_MASTER_CONTEXT",
    input.masterContext.slice(0, 100_000),
    "## PERSONA_RULES",
    bible,
    input.extraInstruction?.trim()
      ? `## USER_NOTES\n${input.extraInstruction.trim()}`
      : "",
    `Lock persona_id to "${input.personaId}" in JSON output.`,
  ].join("\n\n");

  const { text, usage } = await completeTextTracked(SCRIPT_SYSTEM, user, {
    jsonMode: true,
    tier: "standard",
  });
  const script = parsePersonaAnimationScript(text, input.personaId);
  if (script.scenes.length === 0 && text.trim()) {
    script.scenes.push({
      scene_id: "s1",
      scene_description: "Fallback: context 요약 장면",
      dialogue: text.slice(0, 500),
      character_action_cues: "Talking head to camera",
    });
  }
  const llmUsd = usdCostForTokens(
    usage.modelId,
    usage.inputTokens,
    usage.outputTokens,
  );
  return { script, usage, llmUsd };
}
