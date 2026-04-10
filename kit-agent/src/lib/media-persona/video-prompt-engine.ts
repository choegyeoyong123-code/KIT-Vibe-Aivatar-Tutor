import { completeTextTracked } from "@/lib/agent/llm";
import { usdCostForTokens } from "@/lib/agent/pricing";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";
import { PERSONA_VISUAL_STYLE } from "@/lib/media-persona/personas";
import { parseTextToVideoPack } from "@/lib/media-persona/parse-video-prompts";
import type {
  PersonaAnimationScript,
  PersonaId,
  TextToVideoPromptPack,
} from "@/lib/media-persona/types";

const T2V_SYSTEM = `T2V_PROMPT_ENGINE_VEO_SORA_V1
You are a senior prompt engineer for text-to-video (Google Veo, OpenAI Sora-class).
Convert structured animation scenes into production-grade English prompts (models read English best).
Return JSON only:
{
  "model_hints": "string — e.g. duration caps, aspect ratio 16:9",
  "global_style_bible": "string — one paragraph locking art direction",
  "scenes": [
    {
      "scene_id": "string",
      "text_to_video_prompt": "string — rich visual description, shot motion, subject, environment",
      "negative_prompt": "string optional",
      "suggested_duration_sec": number,
      "camera_notes": "string — angle, lens feel, movement",
      "lighting_notes": "string",
      "character_consistency_tokens": "string — recurring wardrobe/face/hair tokens",
      "style_lock": "string — short style clause repeated for consistency"
    }
  ]
}
Align scene count with the provided script. Each prompt must stay faithful to scene_description + action cues + educational intent.`;

export async function generateTextToVideoPromptPack(input: {
  script: PersonaAnimationScript;
  personaId: PersonaId;
}): Promise<{
  pack: TextToVideoPromptPack;
  usage: LlmUsageRecord;
  llmUsd: number;
}> {
  const style = PERSONA_VISUAL_STYLE[input.personaId];
  const user = [
    "## PERSONA_VISUAL_STYLE_BIBLE",
    style,
    "## ANIMATION_SCRIPT_JSON",
    JSON.stringify(input.script, null, 0).slice(0, 80_000),
    "Produce prompts optimized for cinematic educational clarity; avoid copyrighted character names—use generic descriptors that still match the style bible.",
  ].join("\n\n");

  const { text, usage } = await completeTextTracked(T2V_SYSTEM, user, {
    jsonMode: true,
    tier: "standard",
  });
  let pack = parseTextToVideoPack(text, input.script);
  while (pack.scenes.length < input.script.scenes.length) {
    const i = pack.scenes.length;
    const s = input.script.scenes[i];
    if (!s) break;
    pack.scenes.push({
      scene_id: s.scene_id,
      text_to_video_prompt: `${style}. ${s.scene_description}. ${s.character_action_cues}`,
      negative_prompt: "blurry, watermark, subtitles clutter, gore",
      suggested_duration_sec: 6,
      camera_notes: "medium shot, slow push-in",
      lighting_notes: "soft museum key light",
      character_consistency_tokens:
        input.personaId === "shin-chan"
          ? "short boy, black hair, red shirt, thick line art"
          : "adult educator, neutral outfit, clean vector look",
      style_lock: style.slice(0, 200),
    });
  }
  if (pack.scenes.length === 0) {
    pack = {
      model_hints: "16:9, 6–8s per cut, no dialogue text burn-in unless asked",
      global_style_bible: PERSONA_VISUAL_STYLE[input.personaId],
      scenes: input.script.scenes.map((s) => ({
        scene_id: s.scene_id,
        text_to_video_prompt: `${style}. ${s.scene_description}. ${s.character_action_cues}`,
        negative_prompt: "blurry, watermark, subtitles clutter, gore",
        suggested_duration_sec: 6,
        camera_notes: "medium shot, slow push-in",
        lighting_notes: "soft museum key light",
        character_consistency_tokens:
          input.personaId === "shin-chan"
            ? "short boy, black hair, red shirt, thick line art"
            : "adult educator, neutral outfit, clean vector look",
        style_lock: style.slice(0, 200),
      })),
    };
  }
  const llmUsd = usdCostForTokens(
    usage.modelId,
    usage.inputTokens,
    usage.outputTokens,
  );
  return { pack, usage, llmUsd };
}
