import { NextResponse, type NextRequest } from "next/server";
import { analyzeVisualGrounding } from "@/lib/vision/visual-grounding-service";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "file 필드에 이미지 또는 영상을 넣어 주세요." },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "";
    const result = await analyzeVisualGrounding({
      buffer: buf,
      mimeType: mime,
      filename: file.name,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
