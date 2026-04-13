import { z } from "zod";

/** Step 1 — Vision → Logic JSON (Gemini 스키마와 동형) */
export const KeyEntitySchema = z.object({
  name: z.string(),
  role: z.string(),
  detail: z.string().optional(),
});

export const LogicGapSchema = z.object({
  gap: z.string(),
  /** 모델이 자유 문자열로 줄 수 있어 완화 */
  severity: z.string().optional(),
});

export const LogicGraphJsonSchema = z.object({
  core_logic: z.string().min(1),
  key_entities: z.array(KeyEntitySchema).min(1),
  logic_gaps: z.array(LogicGapSchema).min(1),
});

export type LogicGraphJson = z.infer<typeof LogicGraphJsonSchema>;

const BuddyDetectiveSchema = z.object({
  buddy_hint: z.string().min(1),
  detective_deep_dive: z.string().min(1),
});

export const FillBlankQuizSchema = BuddyDetectiveSchema.extend({
  type: z.literal("fill_blank"),
  id: z.string(),
  prompt: z.string(),
  code_template: z.string(),
  acceptable_answers: z.array(z.string()).min(1),
});

export const FlowSequenceQuizSchema = BuddyDetectiveSchema.extend({
  type: z.literal("flow_sequence"),
  id: z.string(),
  prompt: z.string(),
  steps: z.array(z.string()).min(2),
  /** 올바른 순서 = steps 인덱스 순열 */
  correct_order: z.array(z.number().int().nonnegative()).min(2),
}).superRefine((data, ctx) => {
  const n = data.steps.length;
  if (data.correct_order.length !== n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "correct_order 길이는 steps와 같아야 합니다.",
    });
    return;
  }
  const set = new Set(data.correct_order);
  if (set.size !== n) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "correct_order는 중복 없는 인덱스 순열이어야 합니다.",
    });
  }
  for (const i of data.correct_order) {
    if (i < 0 || i >= n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "correct_order 인덱스가 steps 범위를 벗어났습니다.",
      });
      break;
    }
  }
});

export const AnalogyMatchQuizSchema = BuddyDetectiveSchema.extend({
  type: z.literal("analogy_match"),
  id: z.string(),
  prompt: z.string(),
  technical_term: z.string(),
  correct_analogy: z.string(),
  distractors: z.array(z.string()).min(1),
});

export const ZenInteractiveQuizSchema = z.discriminatedUnion("type", [
  FillBlankQuizSchema,
  FlowSequenceQuizSchema,
  AnalogyMatchQuizSchema,
]);

export const ZenQuizPackSchema = z
  .object({
    quizzes: z.array(ZenInteractiveQuizSchema).min(3).max(3),
  })
  .superRefine((data, ctx) => {
    const types = data.quizzes.map((q) => q.type);
    for (const t of ["fill_blank", "flow_sequence", "analogy_match"] as const) {
      if (types.filter((x) => x === t).length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `퀴즈 세트에 ${t} 타입이 정확히 1개 있어야 합니다.`,
        });
      }
    }
  });

export type ZenInteractiveQuiz = z.infer<typeof ZenInteractiveQuizSchema>;
export type ZenQuizPack = z.infer<typeof ZenQuizPackSchema>;

export const AgentVerdictSchema = z.object({
  approve: z.boolean(),
  notes: z.array(z.string()),
});

export type AgentVerdict = z.infer<typeof AgentVerdictSchema>;

export const MetaVoiceScriptSchema = z.object({
  script: z.string().min(1),
  estimated_seconds: z.number().min(5).max(60),
  tone: z.enum(["buddy_encouraging", "explorer_celebratory"]),
});

export type MetaVoiceScript = z.infer<typeof MetaVoiceScriptSchema>;
