import { z } from "zod";

/** Chain 2 — Behavioral Logic Graph (API/LLM와 동형) */
export const LogicFlowStepSchema = z.object({
  step_id: z.string().optional(),
  description: z.string(),
  from_node: z.string().optional(),
  to_node: z.string().optional(),
});

export const StateMutationSchema = z.object({
  entity: z.string(),
  mutation_summary: z.string(),
  trigger: z.string().optional(),
});

export const CriticalPathNodeSchema = z.object({
  label: z.string(),
  /** if-else, switch, api, loop, other 등 */
  decision_type: z.string(),
  detail: z.string().optional(),
});

export const BehavioralLogicGraphSchema = z.object({
  logic_flow: z.array(LogicFlowStepSchema),
  state_mutations: z.array(StateMutationSchema),
  critical_path: z.array(CriticalPathNodeSchema),
});

export type BehavioralLogicGraph = z.infer<typeof BehavioralLogicGraphSchema>;

/** Chain 3 — 주니어가 어려워할 개념 3가지 */
export const EducationalGapItemSchema = z.object({
  learning_objective: z.string().min(1),
  common_misconception: z.string().min(1),
  socratic_question: z.string().min(1),
});

export const EducationalGapSynthesisSchema = z.object({
  gaps: z.array(EducationalGapItemSchema).min(3).max(3),
});

export type EducationalGapSynthesis = z.infer<typeof EducationalGapSynthesisSchema>;

/** Chain 4 — 생성물 (TSX 문자열 + 미리보기용 스펙 + 음성 플레이스홀더) */
export const Chain4PreviewItemSchema = z.object({
  id: z.string(),
  stem: z.string(),
  choices: z.array(z.string()).min(2),
  correct_index: z.number().int().nonnegative(),
  persona_feedback_correct: z.string(),
  persona_feedback_wrong: z.string(),
});

export const Chain4UiBundleSchema = z
  .object({
    component_tsx: z.string().min(20),
    listen_with_my_voice_script_placeholder: z.string().min(1),
    preview_items: z.array(Chain4PreviewItemSchema).min(1).max(5),
    persona_id: z.string(),
  })
  .superRefine((data, ctx) => {
    data.preview_items.forEach((item, i) => {
      if (item.correct_index < 0 || item.correct_index >= item.choices.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `preview_items[${i}].correct_index가 choices 범위를 벗어났습니다.`,
        });
      }
    });
  });

export type Chain4UiBundle = z.infer<typeof Chain4UiBundleSchema>;
