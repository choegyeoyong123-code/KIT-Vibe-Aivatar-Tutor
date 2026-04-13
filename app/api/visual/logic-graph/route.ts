import { NextResponse, type NextRequest } from "next/server";
import { Buffer } from "node:buffer";
import { LogicGraphJsonSchema } from "@/lib/visual-lab/logic-graph-schema";
import { parseDiagramToLogicJson } from "@/lib/visual-lab/vision-to-logic-json";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 4_000_000;

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const ct = req.headers.get("content-type") ?? "";

    let buf: Buffer;
    let mime: string;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "multipart에는 file 필드가 필요합니다." },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "파일이 너무 큽니다." }, { status: 413 });
      }
      buf = Buffer.from(await file.arrayBuffer());
      mime = file.type || "image/png";
    } else {
      const body = (await req.json()) as {
        imageBase64?: string;
        mimeType?: string;
      };
      const b64 = body.imageBase64?.trim();
      if (!b64) {
        return NextResponse.json(
          { error: "imageBase64가 필요합니다." },
          { status: 400 },
        );
      }
      buf = Buffer.from(b64, "base64");
      if (buf.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 413 });
      }
      mime = body.mimeType?.trim() || "image/png";
    }

    const { logic, demo, modelId } = await parseDiagramToLogicJson({
      buffer: buf,
      mimeType: mime,
    });

    LogicGraphJsonSchema.parse(logic);

    return NextResponse.json({
      ok: true,
      demo,
      modelId,
      logic,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Vision 로직 추출 오류" },
      { status: 500 },
    );
  }
}
