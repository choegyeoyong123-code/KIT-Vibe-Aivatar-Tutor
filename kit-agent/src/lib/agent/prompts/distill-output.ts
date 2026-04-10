import type { DistilledData, DistilledTechnicalConcept, PedagogyPack } from "@/lib/agent/types";
import {
  DEFAULT_LEARNING_PERSONA,
  LEARNING_PERSONA_IDS,
  type LearningPersonaId,
} from "@/lib/agent/learning-persona";

/** Parsed distiller JSON envelope (\`KNOWLEDGE_DISTILLER_SYSTEM\`). */
export type DistillerJsonV1 = {
  agent?: string;
  schema_version?: string;
  study_note_markdown?: string;
  pedagogy_pack?: {
    user_learning_persona?: unknown;
    selected_persona_id?: unknown;
    selection_rationale?: unknown;
    avatar_tone_alignment?: unknown;
    variants?: unknown;
  };
  distilled_data?: {
    core_learning_objectives?: unknown;
    technical_concepts?: unknown;
    key_takeaways?: unknown;
    cot_reasoning?: unknown;
  };
  self_check?: {
    claims_grounded_in_materials_only?: boolean;
    uncertain_segments_marked?: boolean;
  };
};

function clampStr(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function asPersonaId(v: unknown): LearningPersonaId {
  if (typeof v === "string" && LEARNING_PERSONA_IDS.includes(v as LearningPersonaId)) {
    return v as LearningPersonaId;
  }
  return DEFAULT_LEARNING_PERSONA;
}

function asStringArray(v: unknown, maxItems: number, maxItemLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => clampStr(x, maxItemLen))
    .slice(0, maxItems);
}

function normalizeTechnicalConcepts(
  v: unknown,
  maxItems: number,
): DistilledTechnicalConcept[] {
  if (!Array.isArray(v)) return [];
  const out: DistilledTechnicalConcept[] = [];
  for (const row of v) {
    if (out.length >= maxItems) break;
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const concept = typeof o.concept === "string" ? clampStr(o.concept, 120) : "";
    const why = typeof o.why === "string" ? clampStr(o.why, 220) : "";
    const how = typeof o.how === "string" ? clampStr(o.how, 220) : "";
    if (concept || why || how) out.push({ concept, why, how });
  }
  return out;
}

function normalizeDistilledData(raw: DistillerJsonV1["distilled_data"]): DistilledData | null {
  if (!raw || typeof raw !== "object") return null;
  const objectives = asStringArray(raw.core_learning_objectives, 8, 200);
  const takeaways = asStringArray(raw.key_takeaways, 12, 160);
  const concepts = normalizeTechnicalConcepts(raw.technical_concepts, 8);
  const cot =
    typeof raw.cot_reasoning === "string" ? clampStr(raw.cot_reasoning, 1200) : "";
  if (!objectives.length && !takeaways.length && !concepts.length && !cot) return null;
  return {
    core_learning_objectives: objectives,
    technical_concepts: concepts,
    key_takeaways: takeaways,
    cot_reasoning: cot,
  };
}

const MAX_VARIANT_MD = 12_000;

function normalizePedagogyPack(
  raw: DistillerJsonV1["pedagogy_pack"],
  fallbackUserPersona: LearningPersonaId,
): PedagogyPack | null {
  if (!raw || typeof raw !== "object") return null;
  const user_learning_persona = raw.user_learning_persona
    ? asPersonaId(raw.user_learning_persona)
    : fallbackUserPersona;
  const selected_persona_id = asPersonaId(raw.selected_persona_id);
  const selection_rationale =
    typeof raw.selection_rationale === "string"
      ? clampStr(raw.selection_rationale, 800)
      : "";
  const avatar_tone_alignment =
    typeof raw.avatar_tone_alignment === "string"
      ? clampStr(raw.avatar_tone_alignment, 400)
      : "";

  const variantsIn: unknown[] = Array.isArray(raw.variants) ? raw.variants : [];
  const variants = LEARNING_PERSONA_IDS.map((pid, idx) => {
    const row = variantsIn[idx];
    if (!row || typeof row !== "object") {
      return {
        persona_id: pid,
        label: pid,
        study_note_markdown: "",
        tone_notes: "",
      };
    }
    const o = row as Record<string, unknown>;
    const md =
      typeof o.study_note_markdown === "string"
        ? o.study_note_markdown.slice(0, MAX_VARIANT_MD).trim()
        : "";
    return {
      persona_id: pid,
      label: typeof o.label === "string" ? clampStr(o.label, 120) : pid,
      study_note_markdown: md,
      tone_notes: typeof o.tone_notes === "string" ? clampStr(o.tone_notes, 200) : "",
    };
  });

  const hasAnyMd = variants.some((v) => v.study_note_markdown.length > 0);
  if (!hasAnyMd) return null;

  return {
    user_learning_persona,
    selected_persona_id,
    selection_rationale,
    avatar_tone_alignment,
    variants,
  };
}

function resolveStudyNoteMarkdown(
  j: DistillerJsonV1,
  pack: PedagogyPack | null,
): string {
  const top = typeof j.study_note_markdown === "string" ? j.study_note_markdown.trim() : "";
  if (pack) {
    const sel = pack.variants.find((v) => v.persona_id === pack.selected_persona_id);
    const fromVar = sel?.study_note_markdown?.trim() ?? "";
    if (fromVar) return fromVar;
  }
  return top;
}

function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export type ParsedDistillerEnvelope = {
  study_note_markdown: string;
  distilledData: DistilledData | null;
  pedagogyPack: PedagogyPack | null;
};

/**
 * JSON 봉투 전체 파싱. 실패 시 원문을 마크다운으로 간주.
 */
export function parseDistillerEnvelope(
  raw: string,
  userLearningPersona: LearningPersonaId = DEFAULT_LEARNING_PERSONA,
): ParsedDistillerEnvelope {
  const t = stripJsonFences(raw);
  try {
    const j = JSON.parse(t) as DistillerJsonV1;
    const pedagogyPack = normalizePedagogyPack(j.pedagogy_pack, userLearningPersona);
    const md = resolveStudyNoteMarkdown(j, pedagogyPack);
    if (md) {
      return {
        study_note_markdown: md,
        distilledData: normalizeDistilledData(j.distilled_data),
        pedagogyPack,
      };
    }
  } catch {
    /* legacy plain Markdown */
  }
  return { study_note_markdown: t, distilledData: null, pedagogyPack: null };
}

export function parseDistillerModelOutput(raw: string): string {
  return parseDistillerEnvelope(raw).study_note_markdown;
}
