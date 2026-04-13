import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface TtsSceneResult {
  sceneId: string;
  relativePath: string;
  chars: number;
  ok: boolean;
}

/**
 * OpenAI Speech API → MP3 파일. 키 없으면 ok: false.
 */
export async function synthesizeSceneDialogues(input: {
  jobId: string;
  scenes: { scene_id: string; dialogue: string }[];
  personaVoiceKey?: "shin-chan" | "neutral-educator";
  /** 사용자 음색 근사 — gpt-4o-mini-tts + instructions (Gemini 분석 기반) */
  userVoiceTtsInstructions?: string | null;
}): Promise<{
  results: TtsSceneResult[];
  ttsEstimateUsd: number;
}> {
  const key = process.env.OPENAI_API_KEY;
  const instructions = input.userVoiceTtsInstructions?.trim();
  const useInstructionalTts = Boolean(instructions);
  const model = useInstructionalTts
    ? process.env.MEDIA_TTS_MODEL_WITH_VOICE ?? "gpt-4o-mini-tts"
    : process.env.MEDIA_TTS_MODEL ?? "tts-1";
  const voiceShin =
    process.env.MEDIA_TTS_VOICE_SHINCHAN ?? process.env.MEDIA_TTS_VOICE ?? "nova";
  const voiceNeutral =
    process.env.MEDIA_TTS_VOICE_NEUTRAL ?? process.env.MEDIA_TTS_VOICE ?? "alloy";
  const voice =
    input.personaVoiceKey === "neutral-educator" ? voiceNeutral : voiceShin;

  const per1k = Number(process.env.MEDIA_TTS_USD_PER_1K_CHARS);
  const rate =
    Number.isFinite(per1k) && per1k > 0 ? per1k : 0.015;

  const outDir = path.join(
    process.cwd(),
    "public",
    "media-output",
    input.jobId,
  );
  await mkdir(outDir, { recursive: true });

  const results: TtsSceneResult[] = [];
  let totalChars = 0;

  if (!key) {
    for (const s of input.scenes) {
      results.push({
        sceneId: s.scene_id,
        relativePath: "",
        chars: s.dialogue.length,
        ok: false,
      });
    }
    return { results, ttsEstimateUsd: 0 };
  }

  for (let i = 0; i < input.scenes.length; i++) {
    const s = input.scenes[i];
    const text = s.dialogue.trim().slice(0, 4096);
    const file = `scene-${i}-${encodeURIComponent(s.scene_id)}.mp3`;
    const abs = path.join(outDir, file);
    totalChars += text.length;

    if (!text) {
      results.push({
        sceneId: s.scene_id,
        relativePath: `/media-output/${input.jobId}/${file}`,
        chars: 0,
        ok: false,
      });
      continue;
    }

    const payload: Record<string, unknown> = {
      model,
      voice,
      input: text,
      response_format: "mp3",
    };
    if (useInstructionalTts && instructions) {
      payload.instructions = instructions;
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      results.push({
        sceneId: s.scene_id,
        relativePath: "",
        chars: text.length,
        ok: false,
      });
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(abs, buf);
    results.push({
      sceneId: s.scene_id,
      relativePath: `/media-output/${input.jobId}/${file}`,
      chars: text.length,
      ok: true,
    });
  }

  return {
    results,
    ttsEstimateUsd: (totalChars / 1000) * rate,
  };
}
