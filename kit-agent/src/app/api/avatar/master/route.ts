import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { generateMasterAvatar } from "@/lib/avatar/master-avatar";
import type { AvatarStylePreset } from "@/lib/avatar/types";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

function resolveStyle(raw: string | null): AvatarStylePreset {
  if (raw === "cel_anime" || raw === "flat_vector") return raw;
  return "3d_animation";
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "replicate");
  if (limited) return limited;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "file 필드에 얼굴 사진을 넣어 주세요." },
        { status: 400 },
      );
    }

    const style = resolveStyle(
      typeof form.get("stylePreset") === "string"
        ? (form.get("stylePreset") as string)
        : null,
    );
    const kitPersonaRaw = form.get("kitPersonaId");
    const kitPersonaId =
      typeof kitPersonaRaw === "string" && kitPersonaRaw.trim()
        ? kitPersonaRaw.trim()
        : undefined;

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const result = await generateMasterAvatar({
      buffer: buf,
      mimeType: mime,
      stylePreset: style,
      kitPersonaId,
    });

    return NextResponse.json({
      ...result,
      requestId: randomUUID(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
