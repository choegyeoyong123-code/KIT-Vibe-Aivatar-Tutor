import { Buffer } from "node:buffer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const TUTOR_SYSTEM = `You are a patient, accurate tutor for learners studying software, systems, and STEM.
Rules:
- Answer in **Korean** unless the user explicitly asks another language.
- Use **GitHub-flavored Markdown**: headings, bullet lists, bold for emphasis, fenced code blocks for code or stack traces.
- Ground claims in what is **visible** in the images; if something is unclear, say so and suggest what to capture next.
- No hallucinated file names or line numbers unless they appear in the image or user text.
- Keep tone warm and concise — like a thoughtful peer, not a corporate changelog.`;

function resolveGoogleVisionModel(): string {
  return process.env.GOOGLE_VISION_MODEL ?? "gemini-2.0-flash";
}

function resolveOpenAiVisionModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

function normalizeMime(m: string): string {
  const s = m.trim().toLowerCase();
  if (s === "image/jpg") return "image/jpeg";
  return s;
}

function mockMarkdown(userPrompt: string, imageCount: number): string {
  return [
    "### 데모 응답",
    "",
    "지금은 **API 키가 설정되지 않아** 모의 답변만 표시됩니다.",
    "",
    `- **질문 요약:** ${userPrompt.slice(0, 280)}${userPrompt.length > 280 ? "…" : ""}`,
    `- **첨부 이미지:** ${imageCount}장`,
    "",
    "`.env`에 `GOOGLE_API_KEY` 또는 `OPENAI_API_KEY`를 넣으면 실제 멀티모달 분석이 실행됩니다.",
  ].join("\n");
}

async function runWithGoogle(opts: {
  userPrompt: string;
  images: { buffer: Buffer; mimeType: string }[];
  extraTextParts: string[];
}): Promise<{ markdown: string; modelId: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY 없음");

  const modelName = resolveGoogleVisionModel();
  const gen = new GoogleGenerativeAI(apiKey);
  const model = gen.getGenerativeModel({ model: modelName });

  const inlineParts = opts.images.map((img) => ({
    inlineData: {
      data: img.buffer.toString("base64"),
      mimeType: normalizeMime(img.mimeType) || "image/png",
    },
  }));

  const preamble = [
    TUTOR_SYSTEM,
    "",
    ...opts.extraTextParts.map((t) => `추가 맥락:\n${t}`),
    "",
    "사용자 질문:",
    opts.userPrompt,
  ].join("\n");

  const result = await model.generateContent([...inlineParts, { text: preamble }]);
  const markdown = (result.response.text() ?? "").trim() || "_빈 응답이에요. 다시 시도해 주세요._";
  return { markdown, modelId: modelName };
}

async function runWithOpenAI(opts: {
  userPrompt: string;
  images: { buffer: Buffer; mimeType: string }[];
  extraTextParts: string[];
}): Promise<{ markdown: string; modelId: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY 없음");

  const modelId = resolveOpenAiVisionModel();
  const model = new ChatOpenAI({
    model: modelId,
    temperature: 0.35,
    apiKey,
  });

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  for (const img of opts.images) {
    const mime = normalizeMime(img.mimeType) || "image/png";
    const url = `data:${mime};base64,${img.buffer.toString("base64")}`;
    content.push({ type: "image_url", image_url: { url } });
  }

  const userBlock = [
    ...opts.extraTextParts.map((t) => `추가 맥락:\n${t}`),
    "",
    "사용자 질문:",
    opts.userPrompt,
  ]
    .filter(Boolean)
    .join("\n");

  content.push({ type: "text", text: userBlock });

  const res = await model.invoke([
    new SystemMessage(TUTOR_SYSTEM),
    new HumanMessage({ content }),
  ]);
  const raw =
    typeof res.content === "string" ? res.content : JSON.stringify(res.content);
  const markdown = raw.trim() || "_빈 응답이에요. 다시 시도해 주세요._";
  return { markdown, modelId: modelId };
}

export async function runMultimodalAnalyze(opts: {
  userPrompt: string;
  images: { buffer: Buffer; mimeType: string }[];
  /** parts 배열에서 온 추가 텍스트(선택) */
  extraTextParts?: string[];
}): Promise<{ markdown: string; provider: "google" | "openai" | "mock"; modelId: string }> {
  const extra = opts.extraTextParts?.filter((t) => t.trim()) ?? [];

  if (opts.images.length === 0) {
    return {
      markdown: "_이미지가 없습니다. 이미지를 함께 올려 주세요._",
      provider: "mock",
      modelId: "none",
    };
  }

  const hasGoogle = Boolean(process.env.GOOGLE_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (!hasGoogle && !hasOpenAI) {
    return {
      markdown: mockMarkdown(opts.userPrompt, opts.images.length),
      provider: "mock",
      modelId: "mock-multimodal",
    };
  }

  if (hasGoogle) {
    try {
      const { markdown, modelId } = await runWithGoogle({
        userPrompt: opts.userPrompt,
        images: opts.images,
        extraTextParts: extra,
      });
      return { markdown, provider: "google", modelId };
    } catch (e) {
      if (!hasOpenAI) throw e instanceof Error ? e : new Error(String(e));
    }
  }

  const { markdown, modelId } = await runWithOpenAI({
    userPrompt: opts.userPrompt,
    images: opts.images,
    extraTextParts: extra,
  });
  return { markdown, provider: "openai", modelId };
}
