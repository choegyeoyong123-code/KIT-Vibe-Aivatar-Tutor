import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 나레이션 오디오를 `public/avatar-cache`에 저장하고 URL 반환 (강의 파이프라인과 결합용). */
export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "standard");
  if (limited) return limited;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "file 필드에 오디오(mp3 등)를 넣어 주세요." },
        { status: 400 },
      );
    }

    const sid = randomUUID();
    const base = path.join(process.cwd(), "public", "avatar-cache", sid);
    await mkdir(base, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase().endsWith(".wav") ? "narration.wav" : "narration.mp3";
    const abs = path.join(base, name);
    await writeFile(abs, buf);
    const url = `/avatar-cache/${sid}/${name}`;

    return NextResponse.json({ sessionId: sid, audioUrl: url });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
