import { NextResponse, type NextRequest } from "next/server";
import { Buffer } from "node:buffer";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { runMultimodalAnalyze } from "@/lib/analyze/run-multimodal-analyze";
import type { AnalyzeRequestJson } from "@/lib/analyze/multimodal-analyze-types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 4;

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function normalizeMime(m: string): string {
  const s = m.trim().toLowerCase();
  if (s === "image/jpg") return "image/jpeg";
  return s;
}

function estimateBase64Bytes(b64: string): number {
  const len = b64.replace(/\s/g, "").length;
  return Math.floor((len * 3) / 4);
}

/** JSON: { userPrompt, images[], parts? } — FormData: file + prompt */
export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const ct = req.headers.get("content-type") ?? "";

    let userPrompt = "";
    const imageBuffers: { buffer: Buffer; mimeType: string }[] = [];
    const extraTextParts: string[] = [];

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const promptRaw = form.get("prompt");
      userPrompt =
        typeof promptRaw === "string" ? promptRaw.trim() : "";
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "이미지 파일과 질문을 함께 보내 주세요." },
          { status: 400 },
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "파일이 너무 커요! (한 장당 최대 8MB)" }, { status: 413 });
      }
      const mime = normalizeMime(file.type || "application/octet-stream");
      if (!ALLOWED_MIME.has(mime)) {
        return NextResponse.json(
          { error: "PNG, JPG, WEBP 이미지만 지원해요." },
          { status: 400 },
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      imageBuffers.push({ buffer: buf, mimeType: mime });
    } else {
      const body = (await req.json()) as AnalyzeRequestJson;
      userPrompt = typeof body.userPrompt === "string" ? body.userPrompt.trim() : "";
      const images = Array.isArray(body.images) ? body.images : [];
      const parts = Array.isArray(body.parts) ? body.parts : [];

      for (const p of parts) {
        if (p?.type === "text" && typeof (p as { text?: string }).text === "string") {
          const t = (p as { text: string }).text.trim();
          if (t) extraTextParts.push(t);
        }
        if (p?.type === "image") {
          const img = p as { mimeType?: string; data?: string };
          const mime = normalizeMime(String(img.mimeType ?? ""));
          const data = String(img.data ?? "").replace(/\s/g, "");
          if (!ALLOWED_MIME.has(mime)) {
            return NextResponse.json(
              { error: "PNG, JPG, WEBP 이미지만 지원해요." },
              { status: 400 },
            );
          }
          if (!data) {
            return NextResponse.json({ error: "이미지 데이터가 비어 있어요." }, { status: 400 });
          }
          if (estimateBase64Bytes(data) > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: "파일이 너무 커요! (한 장당 최대 8MB)" }, { status: 413 });
          }
          imageBuffers.push({
            buffer: Buffer.from(data, "base64"),
            mimeType: mime,
          });
        }
      }

      for (const im of images) {
        if (!im || typeof im.data !== "string") continue;
        const mime = normalizeMime(String(im.mimeType ?? ""));
        const data = im.data.replace(/\s/g, "");
        if (!ALLOWED_MIME.has(mime)) {
          return NextResponse.json(
            { error: "PNG, JPG, WEBP 이미지만 지원해요." },
            { status: 400 },
          );
        }
        if (estimateBase64Bytes(data) > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: "파일이 너무 커요! (한 장당 최대 8MB)" }, { status: 413 });
        }
        imageBuffers.push({
          buffer: Buffer.from(data, "base64"),
          mimeType: mime,
        });
      }

      if (imageBuffers.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `이미지는 최대 ${MAX_IMAGES}장까지 올릴 수 있어요.` },
          { status: 400 },
        );
      }
    }

    if (!userPrompt) {
      return NextResponse.json(
        { error: "질문(프롬프트)을 입력해 주세요." },
        { status: 400 },
      );
    }
    if (imageBuffers.length === 0) {
      return NextResponse.json(
        { error: "분석할 이미지가 필요해요." },
        { status: 400 },
      );
    }

    const out = await runMultimodalAnalyze({
      userPrompt,
      images: imageBuffers,
      extraTextParts,
    });

    return NextResponse.json({
      markdown: out.markdown,
      provider: out.provider,
      modelId: out.modelId,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "서버 오류";
    const lower = msg.toLowerCase();
    let friendly = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
    if (lower.includes("timeout") || lower.includes("timed out")) {
      friendly = "응답이 너무 오래 걸려 중단됐어요. 질문을 짧게 나누어 보세요.";
    } else if (lower.includes("payload") || lower.includes("too large")) {
      friendly = "파일이 너무 커요! (한 장당 최대 8MB)";
    }
    return NextResponse.json({ error: friendly, detail: msg }, { status: 500 });
  }
}

/** GET은 헬스체크용 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/analyze",
    methods: ["POST"],
    bodyJson: {
      userPrompt: "string",
      images: [{ mimeType: "image/png", data: "base64..." }],
      parts: [{ type: "text", text: "optional" }],
    },
    bodyFormData: ["file: File", "prompt: string"],
  });
}
