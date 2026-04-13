import { Buffer } from "node:buffer";

/** 짧은 데모 톤(모노 16-bit PCM) — 미디어 플레이어 UI 검증용 */
export function buildDemoChimeWavBuffer(options?: {
  /** 샘플레이트 */
  sampleRate?: number;
  /** 길이(초) */
  durationSec?: number;
  /** Hz */
  frequency?: number;
}): Buffer {
  const sampleRate = options?.sampleRate ?? 22050;
  const durationSec = options?.durationSec ?? 0.9;
  const frequency = options?.frequency ?? 523.25;
  const numSamples = Math.floor(sampleRate * durationSec);
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const twoPiF = (2 * Math.PI * frequency) / sampleRate;
  const vol = 0.22;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, i / 800) * Math.min(1, (numSamples - i) / 1200);
    const s = Math.sin(twoPiF * i) * vol * env;
    const sample = Math.max(-1, Math.min(1, s));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  return buffer;
}
