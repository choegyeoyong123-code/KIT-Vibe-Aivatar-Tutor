import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { muxPlaceholderMp4 } from "@/lib/media-persona/render-ffmpeg";
import { synthesizeSceneDialogues } from "@/lib/media-persona/tts-openai";
import type { PersonaAnimationScript } from "@/lib/media-persona/types";

export async function runMediaRenderPipeline(input: {
  jobId: string;
  script: PersonaAnimationScript;
  /** persona 외 "내 목소리" 근사 시 Gemini→TTS 지침 */
  userVoiceTtsInstructions?: string | null;
}): Promise<{
  sceneAudioPaths: string[];
  combinedAudioUrl: string | null;
  mp4Url: string | null;
  ffmpegOk: boolean;
  ttsEstimateUsd: number;
  ttsAnyOk: boolean;
}> {
  const { results, ttsEstimateUsd } = await synthesizeSceneDialogues({
    jobId: input.jobId,
    scenes: input.script.scenes.map((s) => ({
      scene_id: s.scene_id,
      dialogue: s.dialogue,
    })),
    personaVoiceKey: input.script.persona_id,
    userVoiceTtsInstructions: input.userVoiceTtsInstructions,
  });

  const sceneAudioPaths = results
    .filter((r) => r.ok && r.relativePath)
    .map((r) => r.relativePath);

  const absMp3s = sceneAudioPaths.map((rel) =>
    path.join(process.cwd(), "public", rel.replace(/^\//, "")),
  );

  const mux = await muxPlaceholderMp4({
    jobId: input.jobId,
    mp3AbsPaths: absMp3s,
  });

  const manifestDir = path.join(
    process.cwd(),
    "public",
    "media-output",
    input.jobId,
  );
  await mkdir(manifestDir, { recursive: true });
  await writeFile(
    path.join(manifestDir, "manifest.json"),
    JSON.stringify(
      {
        jobId: input.jobId,
        sceneAudioPaths,
        combinedAudioUrl: mux.combinedMp3Url,
        mp4Url: mux.mp4Url,
        ttsEstimateUsd,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf-8",
  );

  return {
    sceneAudioPaths,
    combinedAudioUrl: mux.combinedMp3Url,
    mp4Url: mux.mp4Url,
    ffmpegOk: mux.ffmpeg,
    ttsEstimateUsd,
    ttsAnyOk: results.some((r) => r.ok),
  };
}
