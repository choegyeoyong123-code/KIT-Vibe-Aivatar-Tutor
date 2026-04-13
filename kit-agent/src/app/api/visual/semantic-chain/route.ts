import { NextResponse, type NextRequest } from "next/server";
import { Buffer } from "node:buffer";
import { z } from "zod";
import type { EducationalPersonaId } from "@/constants/personas";
import { getEducationalPersonaById } from "@/constants/personas";
import {
  BehavioralLogicGraphSchema,
  EducationalGapSynthesisSchema,
} from "@/lib/visual-lab/semantic-chain-schema";
import {
  runChain1VisualSemantic,
  runChain2BehavioralGraph,
  runChain3EducationalGaps,
  runChain4UiBundle,
  runSemanticChainFull,
} from "@/lib/visual-lab/semantic-chain-pipeline";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 4_000_000;

const PersonaIdSchema = z.enum([
  "metaphor_mage",
  "pair_mate",
  "compressed_cto",
  "quest_master",
  "deepdive_professor",
]);

const JsonBodySchema = z.object({
  mode: z
    .enum(["all", "chain1", "chain2", "chain3", "chain4"])
    .optional()
    .default("all"),
  imageBase64: z.string().optional(),
  mimeType: z.string().optional(),
  chain1_markdown: z.string().optional(),
  chain2_graph: z.unknown().optional(),
  chain3_synthesis: z.unknown().optional(),
  current_persona: PersonaIdSchema.optional().default("metaphor_mage"),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;

  try {
    const ct = req.headers.get("content-type") ?? "";

    let buffer: Buffer | null = null;
    let mime = "image/png";
    let mode: z.infer<typeof JsonBodySchema>["mode"] = "all";
    let personaId: EducationalPersonaId = "metaphor_mage";
    let chain1Markdown: string | undefined;
    let chain2Graph: unknown;
    let chain3Synthesis: unknown;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const m = form.get("mode");
      const p = form.get("current_persona");
      if (typeof m === "string" && m) mode = m as typeof mode;
      if (typeof p === "string" && PersonaIdSchema.safeParse(p).success) {
        personaId = p as EducationalPersonaId;
      }
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_BYTES) {
          return NextResponse.json({ error: "파일이 너무 큽니다." }, { status: 413 });
        }
        buffer = Buffer.from(await file.arrayBuffer());
        mime = file.type || "image/png";
      }
    } else {
      const body = JsonBodySchema.parse(await req.json());
      mode = body.mode;
      personaId = body.current_persona as EducationalPersonaId;
      chain1Markdown = body.chain1_markdown;
      chain2Graph = body.chain2_graph;
      chain3Synthesis = body.chain3_synthesis;
      const b64 = body.imageBase64?.trim();
      if (b64) {
        buffer = Buffer.from(b64, "base64");
        if (buffer.byteLength > MAX_BYTES) {
          return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 413 });
        }
        mime = body.mimeType?.trim() || "image/png";
      }
    }

    if (!getEducationalPersonaById(personaId)) {
      return NextResponse.json({ error: "알 수 없는 페르소나입니다." }, { status: 400 });
    }

    if (mode === "all") {
      if (!buffer) {
        return NextResponse.json(
          { error: "all 모드에서는 이미지(file 또는 imageBase64)가 필요합니다." },
          { status: 400 },
        );
      }
      const out = await runSemanticChainFull({
        buffer,
        mimeType: mime,
        personaId,
      });
      return NextResponse.json({ ok: true as const, ...out });
    }

    if (mode === "chain1") {
      if (!buffer) {
        return NextResponse.json({ error: "이미지가 필요합니다." }, { status: 400 });
      }
      const c1 = await runChain1VisualSemantic({ buffer, mimeType: mime });
      return NextResponse.json({ ok: true as const, ...c1 });
    }

    if (mode === "chain2") {
      if (!chain1Markdown?.trim()) {
        return NextResponse.json(
          { error: "chain1_markdown이 필요합니다." },
          { status: 400 },
        );
      }
      const c2 = await runChain2BehavioralGraph(chain1Markdown);
      return NextResponse.json({ ok: true as const, ...c2 });
    }

    if (mode === "chain3") {
      const graph = BehavioralLogicGraphSchema.parse(chain2Graph);
      const c3 = await runChain3EducationalGaps(graph);
      return NextResponse.json({ ok: true as const, ...c3 });
    }

    if (mode === "chain4") {
      const graph = BehavioralLogicGraphSchema.parse(chain2Graph);
      const synthesis = EducationalGapSynthesisSchema.parse(chain3Synthesis);
      const c4 = await runChain4UiBundle({ graph, synthesis, personaId });
      return NextResponse.json({ ok: true as const, ...c4 });
    }

    return NextResponse.json({ error: "지원하지 않는 mode입니다." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "semantic-chain 오류" },
      { status: 500 },
    );
  }
}
