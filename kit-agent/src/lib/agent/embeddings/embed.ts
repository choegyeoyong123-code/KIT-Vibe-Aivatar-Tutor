import { OpenAIEmbeddings } from "@langchain/openai";

const BOW_DIM = 384;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

/** API 키 없을 때 결정적 BOW 스타일 벡터 (코사인 유사도용) */
export function bowEmbedding(text: string): number[] {
  const v = new Array(BOW_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[\w\uac00-\ud7af]+/g) ?? [];
  for (const t of tokens) {
    v[hashStr(t) % BOW_DIM] += 1;
  }
  return normalize(v);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    const emb = new OpenAIEmbeddings({ model });
    return emb.embedDocuments(texts);
  }
  return texts.map(bowEmbedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
