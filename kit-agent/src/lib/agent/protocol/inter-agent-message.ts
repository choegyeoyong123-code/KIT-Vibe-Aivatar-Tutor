import type { AgentGraphNodeId, InterAgentMessage } from "@/lib/agent/types";

/** 대략 토큰 추정(라틴+한글 혼합 보수적): chars / 4 */
export function roughTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

const MAX_HANDOFF_TOKENS = 100;
const CHARS_PER_TOKEN_EST = 4;
const MAX_BULLET_CHARS = MAX_HANDOFF_TOKENS * CHARS_PER_TOKEN_EST;

function clampText(s: string, maxChars: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}

function buildBulletSummary(
  taskDone: string,
  keyFindings: string,
  nextAction: string,
): string {
  const parts = [
    `- **Done**: ${clampText(taskDone, 100)}`,
    `- **Findings**: ${clampText(keyFindings, 110)}`,
    `- **Next**: ${clampText(nextAction, 110)}`,
  ];
  let body = parts.join("\n");
  while (roughTokenCount(body) > MAX_HANDOFF_TOKENS && body.length > 60) {
    body = `${body.slice(0, Math.floor(body.length * 0.88)).trim()}…`;
  }
  if (body.length > MAX_BULLET_CHARS) {
    body = `${body.slice(0, MAX_BULLET_CHARS - 1)}…`;
  }
  return body;
}

function defaultTerminalLine(from: AgentGraphNodeId, taskDone: string): string {
  const label = from.replace(/_/g, "");
  const one = clampText(taskDone, 90);
  return `${label}: ${one}`;
}

/**
 * Message-in-State: 불릿 요약 + 터미널 한 줄. ~100토큰 상한으로 컨텍스트 팽창 억제.
 * LangGraph: `return { interAgentMessages: [handoff(...)] }`.
 */
export function handoff(input: {
  from: AgentGraphNodeId;
  to: AgentGraphNodeId;
  taskDone: string;
  keyFindings: string;
  nextAction: string;
  errors?: string | null;
  structured?: Record<string, unknown>;
  /** UI 한 줄 오버라이드(미주입 시 from+taskDone으로 생성) */
  terminalLine?: string;
}): InterAgentMessage {
  const bulletSummary = buildBulletSummary(
    input.taskDone,
    input.keyFindings,
    input.nextAction,
  );
  const terminalLine =
    input.terminalLine?.trim() ||
    defaultTerminalLine(input.from, input.taskDone);
  const tl = clampText(terminalLine, 160);
  const tokenEstimate = roughTokenCount(
    `${tl}\n${bulletSummary}${input.errors ? `\nERR:${input.errors}` : ""}`,
  );
  return {
    at: new Date().toISOString(),
    from: input.from,
    to: input.to,
    terminalLine: tl,
    bulletSummary,
    tokenEstimate,
    errors: input.errors ?? null,
    structured: sanitizeStructured(input.structured),
  };
}

/** 대화에 DB 행·긴 텍스트가 스며들지 않도록 structured 축소 */
function sanitizeStructured(
  s: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!s) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (Object.keys(out).length >= 12) break;
    if (v == null || typeof v === "boolean" || typeof v === "number") {
      out[k] = v as boolean | number | null;
      continue;
    }
    if (typeof v === "string") {
      out[k] = clampText(v, 80);
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.slice(0, 6).map((x) => (typeof x === "string" ? clampText(x, 48) : x));
      continue;
    }
    out[k] = "[object]";
  }
  return out;
}
