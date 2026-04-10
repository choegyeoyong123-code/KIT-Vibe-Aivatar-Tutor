import { execFileSync } from "child_process";
import { writeFile } from "fs/promises";
import {
  AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE,
  isWav2lipReplicateConfigured,
} from "@/lib/avatar/replicate-config";
import { runReplicateModelVersion } from "@/lib/avatar/replicate-client";

function parseWav2lipExtra(): Record<string, unknown> {
  const raw = process.env.REPLICATE_WAV2LIP_INPUT_JSON;
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * 마스터 얼굴 + 나레이션 오디오 → 립싱크 비디오(Replicate SDK + REPLICATE_WAV2LIP_VERSION) 또는 ffmpeg 폴백.
 */
export async function renderLipSyncClip(input: {
  masterImageAbs: string;
  audioAbs: string;
  outMp4Abs: string;
  masterPublicUrl: string;
  audioPublicUrl: string;
  /** Persona Resonance: REPLICATE_WAV2LIP 입력에 병합 */
  personaWav2lipExtras?: Record<string, unknown>;
}): Promise<{
  mode: "replicate_wav2lip" | "static_ken_burns";
  userMessage?: string;
}> {
  const wav2lip = process.env.REPLICATE_WAV2LIP_VERSION?.trim() ?? "";

  if (!isWav2lipReplicateConfigured()) {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        input.masterImageAbs,
        "-i",
        input.audioAbs,
        "-vf",
        "scale=720:-2",
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        input.outMp4Abs,
      ],
      { stdio: "ignore" },
    );
    return {
      mode: "static_ken_burns",
      userMessage: AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE,
    };
  }

  const modelInput: Record<string, unknown> = {
    ...parseWav2lipExtra(),
    ...(input.personaWav2lipExtras ?? {}),
    face: input.masterPublicUrl,
    audio: input.audioPublicUrl,
  };

  const wavMax = Number(process.env.REPLICATE_WAV2LIP_MAX_MS);
  const maxWaitMs =
    Number.isFinite(wavMax) && wavMax > 5_000 ? wavMax : 120_000;

  try {
    const vidUrl = await runReplicateModelVersion({
      version: wav2lip,
      input: modelInput,
      maxWaitMs,
    });
    const ab = await fetch(vidUrl).then((r) => r.arrayBuffer());
    const buf = Buffer.from(new Uint8Array(ab));
    await writeFile(input.outMp4Abs, buf);
    return { mode: "replicate_wav2lip" };
  } catch (e) {
    console.warn("Wav2Lip (Replicate SDK) failed, static fallback:", e);
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        input.masterImageAbs,
        "-i",
        input.audioAbs,
        "-vf",
        "scale=720:-2",
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        input.outMp4Abs,
      ],
      { stdio: "ignore" },
    );
    return {
      mode: "static_ken_burns",
      userMessage: `${AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE} A static image + audio clip was used instead.`,
    };
  }
}
