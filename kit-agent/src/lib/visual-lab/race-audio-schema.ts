import { z } from "zod";
import { LogicGraphJsonSchema } from "@/lib/visual-lab/logic-graph-schema";

/** Analyzer / voice-profile에서 온 음성 DNA (TTS 조건 + 리듬 힌트) */
export const VoiceDnaSchema = z.object({
  pitch_hz_estimate: z.number().nullable().optional(),
  pitch_qualitative: z.string().optional(),
  tone_descriptors: z.array(z.string()).optional(),
  /** Analyzer 값과 동일 권장: slow | moderate | fast */
  speaking_rate: z.string().optional(),
  /** Gemini 음성 분석의 영문 TTS 지침 — 스타일 정렬용 */
  tts_instructions_en: z.string().optional(),
});

export type VoiceDna = z.infer<typeof VoiceDnaSchema>;

export const RaceContentSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("quiz"),
    summary: z.string().min(1),
    user_was_correct: z.boolean(),
    /** 정답/오답 후 튜터 설명 등 */
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal("code_explanation"),
    body: z.string().min(1),
  }),
]);

export type RaceContentSource = z.infer<typeof RaceContentSourceSchema>;

export const RaceAudioScriptResultSchema = z.object({
  /** Google Cloud TTS 등 호환 `<speak>` 루트 SSML */
  ssml_script: z
    .string()
    .min(1)
    .refine((s) => /<speak[\s>]/i.test(s), "루트 <speak> 요소가 필요합니다."),
  /** 자막·미리보기용 — SSML 태그 제거한 한국어 1인칭 본문 */
  plain_script_ko: z.string().min(1),
  estimated_seconds: z.number().min(22).max(38),
  /** RACE 단계 요약 (선택, 심사용) */
  race_trace: z
    .object({
      retrieve: z.string().optional(),
      align: z.string().optional(),
      compose: z.string().optional(),
      encode: z.string().optional(),
    })
    .optional(),
});

export type RaceAudioScriptResult = z.infer<typeof RaceAudioScriptResultSchema>;

export const RaceAudioRequestSchema = z.object({
  logic: LogicGraphJsonSchema,
  voice_dna: VoiceDnaSchema,
  persona_id: z.enum([
    "metaphor_mage",
    "pair_mate",
    "compressed_cto",
    "quest_master",
    "deepdive_professor",
  ]),
  content: RaceContentSourceSchema,
});

export type RaceAudioRequest = z.infer<typeof RaceAudioRequestSchema>;
