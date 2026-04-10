import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE,
  isMasterAvatarReplicateConfigured,
} from "@/lib/avatar/replicate-config";
import { runReplicateModelVersion } from "@/lib/avatar/replicate-client";
import type { AvatarStylePreset, MasterAvatarResult } from "@/lib/avatar/types";
import {
  getPersonaMediaProfile,
  isDynamicPersonaId,
} from "@/lib/agent/persona/persona-presets";

const STYLE_PROMPTS: Record<AvatarStylePreset, string> = {
  "3d_animation":
    "3D animated character portrait, soft studio light, stylized skin, friendly expression, identity preserved",
  cel_anime:
    "cel shaded anime portrait, thick clean outlines, flat color regions, 1990s TV anime look, same person",
  flat_vector:
    "flat vector avatar portrait, minimal geometric shading, editorial illustration, consistent facial identity",
};

function parseExtraInput(): Record<string, unknown> {
  const raw = process.env.REPLICATE_MASTER_AVATAR_INPUT_JSON;
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeSharpFallback(
  input: { buffer: Buffer; stylePreset: AvatarStylePreset },
  masterAbs: string,
): Promise<void> {
  const pipeline = sharp(input.buffer).rotate().resize(512, 512, { fit: "cover" });
  let tuned: sharp.Sharp = pipeline;
  if (input.stylePreset === "cel_anime") {
    tuned = pipeline.modulate({ saturation: 1.28, brightness: 1.04 });
  } else if (input.stylePreset === "3d_animation") {
    tuned = pipeline.modulate({ saturation: 1.05, brightness: 1.06 }).blur(0.35);
  } else {
    tuned = pipeline.modulate({ saturation: 0.92, brightness: 1.02 }).median(1);
  }
  await tuned.png({ quality: 92 }).toFile(masterAbs);
}

/**
 * 업로드 얼굴 → 마스터 아바타 이미지.
 * Replicate SDK + `REPLICATE_MASTER_AVATAR_VERSION` (및 토큰·공개 URL)이 갖춰지면 호출.
 * 그렇지 않거나 실패 시 Sharp 폴백 + `userMessage`로 안내.
 */
export async function generateMasterAvatar(input: {
  buffer: Buffer;
  mimeType: string;
  stylePreset: AvatarStylePreset;
  /** REPLICATE_MASTER_AVATAR_VERSION 프롬프트에 페르소나 표정 힌트 병합 */
  kitPersonaId?: string;
}): Promise<MasterAvatarResult> {
  const sessionId = randomUUID();
  const base = path.join(process.cwd(), "public", "avatar-cache", sessionId);
  await mkdir(base, { recursive: true });
  const ext = input.mimeType.includes("png") ? "png" : "jpg";
  const inputName = `upload.${ext}`;
  const inputAbs = path.join(base, inputName);
  await writeFile(inputAbs, input.buffer);

  const publicInputUrl = `/avatar-cache/${sessionId}/${inputName}`;
  const masterRel = `/avatar-cache/${sessionId}/master.png`;
  const masterAbs = path.join(process.cwd(), "public", masterRel.replace(/^\//, ""));

  const publicBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const repVer = process.env.REPLICATE_MASTER_AVATAR_VERSION?.trim() ?? "";

  const baseResult = {
    url: masterRel,
    sessionId,
    stylePreset: input.stylePreset,
  } as const;

  if (!isMasterAvatarReplicateConfigured()) {
    await writeSharpFallback(input, masterAbs);
    return {
      ...baseResult,
      provider: "sharp_stylize",
      replicateSynthesisUsed: false,
      userMessage: AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE,
    };
  }

  const imageUrl = `${publicBase}${publicInputUrl}`;
  let prompt = STYLE_PROMPTS[input.stylePreset];
  if (input.kitPersonaId && isDynamicPersonaId(input.kitPersonaId)) {
    prompt += getPersonaMediaProfile(input.kitPersonaId).masterAvatarPromptSuffix;
  }

  const modelInput: Record<string, unknown> = {
    ...parseExtraInput(),
    prompt,
    image: imageUrl,
  };

  const masterMax = Number(process.env.REPLICATE_MASTER_MAX_MS);
  const maxWaitMs =
    Number.isFinite(masterMax) && masterMax > 5_000 ? masterMax : 120_000;

  try {
    const outUrl = await runReplicateModelVersion({
      version: repVer,
      input: modelInput,
      maxWaitMs,
    });
    const imgRes = await fetch(outUrl);
    if (!imgRes.ok) throw new Error(await imgRes.text());
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await sharp(buf).png().toFile(masterAbs);
    return {
      ...baseResult,
      url: masterRel,
      provider: "replicate",
      replicateSynthesisUsed: true,
    };
  } catch (e) {
    console.warn("Replicate master avatar failed, using Sharp:", e);
    await writeSharpFallback(input, masterAbs);
    return {
      ...baseResult,
      provider: "sharp_stylize",
      replicateSynthesisUsed: false,
      userMessage: `${AVATAR_SYNTHESIS_UNAVAILABLE_MESSAGE} A local stylized image was used instead.`,
    };
  }
}
