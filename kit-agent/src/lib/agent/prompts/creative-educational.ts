import type { CreativeIntent } from "@/lib/agent/creative/types";

const BASE = `You are a creative EdTech strategist. Stay 100% faithful to the VISUAL_CONTEXT facts—never invent exhibit names, dates, or labels not supported by the context.
Output must be valid JSON only (no markdown). Be memorable and energetic; for rap, use rhythm-friendly lines (reference playful educational rap benchmarks) while remaining classroom-appropriate.`;

const SCHEMAS: Record<CreativeIntent, string> = {
  quiz: `{
  "kind": "quiz",
  "title": "string",
  "questions": [
    {
      "id": "string",
      "prompt": "string",
      "choices": ["four strings"],
      "correctAnswer": "must match one choice exactly",
      "explanation": "string"
    }
  ]
}`,
  rap: `{
  "kind": "rap",
  "title": "string",
  "hook": "string (catchy, 1-2 lines)",
  "verses": ["array of bars, 12-24 short lines total across verses"],
  "outro": "optional string",
  "teachingObjective": "one sentence learning goal"
}`,
  video_script: `{
  "kind": "video_script",
  "title": "string",
  "estimatedDurationSec": number,
  "scenes": [
    { "beat": "time or segment label", "narration": "voiceover", "onScreenVisuals": "what viewer sees" }
  ]
}`,
};

export function buildCreativeEducationalPrompt(input: {
  intent: CreativeIntent;
  visualContextJson: string;
  userGoal?: string;
}): { system: string; user: string } {
  const system = `${BASE}\n\nJSON schema for intent "${input.intent}":\n${SCHEMAS[input.intent]}`;
  const user = [
    "## VISUAL_CONTEXT (ground truth)",
    input.visualContextJson.slice(0, 24_000),
    input.userGoal?.trim()
      ? `\n## USER_GOAL\n${input.userGoal.trim()}`
      : "",
    `\nProduce one JSON object matching kind="${input.intent}".`,
  ].join("\n");
  return { system, user };
}
