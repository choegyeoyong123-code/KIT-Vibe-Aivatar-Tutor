import { Buffer } from "node:buffer";

export type HifiTtsProvider = "elevenlabs" | "openai" | "none";

export type VoiceDnaTtsInput = {
  speaking_rate?: string;
  pitch_qualitative?: string;
  tone_descriptors?: string[];
  tts_instructions_en?: string;
};

export function stripSsmlToPlainText(ssmlOrText: string): string {
  return ssmlOrText
    .replace(/<\/?speak[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapVoiceDnaToElevenLabsSettings(dna?: VoiceDnaTtsInput | null): {
  stability: number;
  similarity_boost: number;
  style: number;
} {
  const r = dna?.speaking_rate?.toLowerCase() ?? "moderate";
  let stability = 0.45;
  let similarity_boost = 0.72;
  let style = 0.25;
  if (r === "slow") {
    stability = 0.36;
    similarity_boost = 0.8;
    style = 0.2;
  } else if (r === "fast") {
    stability = 0.55;
    similarity_boost = 0.64;
    style = 0.35;
  }
  const tones = (dna?.tone_descriptors ?? []).join(" ").toLowerCase();
  if (tones.includes("warm") || tones.includes("soft")) style = Math.min(0.55, style + 0.12);
  return { stability, similarity_boost, style };
}

async function tryElevenLabs(
  plain: string,
  voiceDna: VoiceDnaTtsInput | null | undefined,
  elevenKey: string,
  elevenVoice: string,
): Promise<Buffer | null> {
  const vs = mapVoiceDnaToElevenLabsSettings(voiceDna ?? undefined);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenVoice)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: plain,
        model_id: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
        voice_settings: {
          stability: vs.stability,
          similarity_boost: vs.similarity_boost,
          style: vs.style,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function tryOpenAi(
  plain: string,
  voiceDna: VoiceDnaTtsInput | null | undefined,
  openaiKey: string,
): Promise<Buffer | null> {
  const instructions = [
    voiceDna?.tts_instructions_en?.trim(),
    voiceDna?.pitch_qualitative
      ? `Pitch character hint: ${voiceDna.pitch_qualitative}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 800);

  const model = process.env.MEDIA_TTS_MODEL_WITH_VOICE?.trim() || "gpt-4o-mini-tts";
  const voice = process.env.MEDIA_TTS_VOICE?.trim() || "nova";

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      input: plain.slice(0, 4096),
      response_format: "mp3",
      ...(instructions ? { instructions } : {}),
    }),
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/**
 * 고음질 TTS — **ElevenLabs** 우선(키+voice id), 다음 **OpenAI** `gpt-4o-mini-tts` + Voice 지침.
 * (Google Lyria 등 음악 생성 모델은 별도 제품군 — 여기서는 연동하지 않음.)
 */
export async function synthesizeHighFidelityTts(input: {
  text: string;
  ssml?: string | null;
  voiceDna?: VoiceDnaTtsInput | null;
  prefer?: HifiTtsProvider;
}): Promise<{
  buffer: Buffer;
  mimeType: string;
  provider: HifiTtsProvider;
  demo: boolean;
}> {
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  const elevenVoice = process.env.ELEVENLABS_VOICE_ID?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const raw = (input.ssml?.trim() ? input.ssml : input.text).trim();
  const plain = stripSsmlToPlainText(raw).slice(0, 4500);

  const canEleven = Boolean(elevenKey && elevenVoice);
  const canOpenai = Boolean(openaiKey);
  const prefer = input.prefer ?? "none";

  const runEleven = () =>
    canEleven && elevenKey && elevenVoice
      ? tryElevenLabs(plain, input.voiceDna, elevenKey, elevenVoice)
      : Promise.resolve(null);
  const runOpenai = () =>
    canOpenai && openaiKey
      ? tryOpenAi(plain, input.voiceDna, openaiKey)
      : Promise.resolve(null);

  if (prefer === "elevenlabs") {
    const b = await runEleven();
    if (b?.length) return { buffer: b, mimeType: "audio/mpeg", provider: "elevenlabs", demo: false };
    const o = await runOpenai();
    if (o?.length) return { buffer: o, mimeType: "audio/mpeg", provider: "openai", demo: false };
  } else if (prefer === "openai") {
    const o = await runOpenai();
    if (o?.length) return { buffer: o, mimeType: "audio/mpeg", provider: "openai", demo: false };
    const b = await runEleven();
    if (b?.length) return { buffer: b, mimeType: "audio/mpeg", provider: "elevenlabs", demo: false };
  } else {
    const b = await runEleven();
    if (b?.length) return { buffer: b, mimeType: "audio/mpeg", provider: "elevenlabs", demo: false };
    const o = await runOpenai();
    if (o?.length) return { buffer: o, mimeType: "audio/mpeg", provider: "openai", demo: false };
  }

  return {
    buffer: Buffer.alloc(0),
    mimeType: "audio/mpeg",
    provider: "none",
    demo: true,
  };
}
