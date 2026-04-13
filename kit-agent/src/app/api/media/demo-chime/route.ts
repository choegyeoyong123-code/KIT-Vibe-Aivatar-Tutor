import { NextResponse } from "next/server";
import { buildDemoChimeWavBuffer } from "@/lib/media/demo-chime-wav";

export const runtime = "nodejs";

export async function GET() {
  const buf = buildDemoChimeWavBuffer();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
