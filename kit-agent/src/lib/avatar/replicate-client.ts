import Replicate from "replicate";
import { applyProviderEnvAliases } from "@/lib/bootstrap-env";

applyProviderEnvAliases();

function getClient(): Replicate {
  const auth = process.env.REPLICATE_API_TOKEN?.trim();
  if (!auth) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }
  return new Replicate({ auth });
}

function outputToResultUrl(output: unknown): string {
  if (output == null) {
    throw new Error("Replicate prediction returned no output");
  }
  if (typeof output === "string") {
    return output;
  }
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first != null && typeof (first as { url?: string }).url === "string") {
      return (first as { url: string }).url;
    }
  }
  if (typeof output === "object" && "url" in output) {
    const u = (output as { url?: unknown }).url;
    if (typeof u === "string") return u;
  }
  throw new Error("Replicate output format is not a supported URL");
}

/**
 * Replicate SDK — `version` 해시 + `input`으로 예측 생성 후 완료까지 대기.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runReplicateModelVersion(input: {
  version: string;
  input: Record<string, unknown>;
  pollIntervalMs?: number;
  /** Strategy 9: 초과 시 타임아웃(폴백 경로에서 처리). 기본 180s */
  maxWaitMs?: number;
}): Promise<string> {
  const replicate = getClient();
  let prediction = await replicate.predictions.create({
    version: input.version.trim(),
    input: input.input,
  });
  const interval = input.pollIntervalMs ?? 2000;
  const maxWait = input.maxWaitMs ?? 180_000;
  const deadline = Date.now() + maxWait;

  const busy = new Set(["starting", "processing", "queued"]);
  while (busy.has(String(prediction.status))) {
    if (Date.now() > deadline) {
      throw new Error(`Replicate timed out after ${maxWait}ms`);
    }
    await sleep(interval);
    prediction = await replicate.predictions.get(prediction.id);
  }

  if (prediction.status !== "succeeded") {
    const err =
      prediction.error != null ? String(prediction.error) : prediction.status;
    throw new Error(`Replicate failed: ${err}`);
  }

  return outputToResultUrl(prediction.output);
}
