import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AIMessageChunk } from "@langchain/core/messages";
import { getVendorModelById } from "@/constants/vendor-models";
import type { ActiveModelTier } from "@/lib/agent/types";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";
import { applyProviderEnvAliases } from "@/lib/bootstrap-env";
import { VALIDATE_SYSTEM_MARKER } from "@/lib/agent/prompts/validate";

applyProviderEnvAliases();

function provider(): "openai" | "google" | "mock" {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GOOGLE_API_KEY) return "google";
  return "mock";
}

function resolveOpenAIModel(tier: ActiveModelTier): string {
  if (tier === "economy") {
    return process.env.OPENAI_MODEL_ECONOMY ?? "gpt-4o-mini";
  }
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

function resolveGoogleModel(tier: ActiveModelTier): string {
  if (tier === "economy") {
    return process.env.GOOGLE_MODEL_ECONOMY ?? "gemini-2.0-flash";
  }
  return process.env.GOOGLE_MODEL ?? "gemini-1.5-pro";
}

function readCachedTokens(u: Record<string, unknown> | undefined): number {
  if (!u) return 0;
  const candidates = [
    (u.prompt_tokens_details as { cached_tokens?: unknown } | undefined)?.cached_tokens,
    (u.promptTokensDetails as { cachedTokens?: unknown } | undefined)?.cachedTokens,
    (u.input_token_details as { cache_read?: unknown } | undefined)?.cache_read,
    (u.inputTokenDetails as { cacheRead?: unknown } | undefined)?.cacheRead,
    u.cached_tokens,
    u.cachedTokens,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  }
  return 0;
}

function readUsage(
  res: { usage_metadata?: Record<string, unknown> },
  modelId: string,
  executionTimeMs?: number,
): LlmUsageRecord {
  const u = res.usage_metadata;
  return {
    inputTokens:
      typeof u?.input_tokens === "number" && Number.isFinite(u.input_tokens)
        ? u.input_tokens
        : 0,
    outputTokens:
      typeof u?.output_tokens === "number" && Number.isFinite(u.output_tokens)
        ? u.output_tokens
        : 0,
    modelId,
    cachedTokensHit: readCachedTokens(u),
    executionTimeMs,
  };
}

export interface TrackedTextResult {
  text: string;
  usage: LlmUsageRecord;
}

export interface CompleteTextOptions {
  jsonMode?: boolean;
  /** economy → 저비용 모델 (OpenAI: gpt-4o-mini, Google: flash) */
  tier?: ActiveModelTier;
  /**
   * 멀티 벤더 셀렉터 — `openai:gpt-4o-mini` 형식. 해당 벤더 API 키가 없으면
   * `tier` + 환경 기본 프로바이더로 자동 폴백합니다.
   */
  vendorModelId?: string;
}

type BuiltLlmBackend =
  | { tag: "openai"; model: ChatOpenAI; modelId: string }
  | { tag: "google"; model: ChatGoogleGenerativeAI; modelId: string }
  | { tag: "anthropic"; model: ChatAnthropic; modelId: string }
  | { tag: "mock"; modelId: string };

type LiveLlmBackend = Extract<
  BuiltLlmBackend,
  { tag: "openai" | "google" | "anthropic" }
>;

function buildLlmBackend(options?: CompleteTextOptions): BuiltLlmBackend {
  const tier = options?.tier ?? "standard";
  const spec = options?.vendorModelId?.trim()
    ? getVendorModelById(options.vendorModelId.trim())
    : undefined;

  if (spec) {
    if (spec.vendor === "openai" && process.env.OPENAI_API_KEY) {
      return {
        tag: "openai",
        model: new ChatOpenAI({
          model: spec.apiModelId,
          temperature: 0.2,
          ...(options?.jsonMode
            ? { modelKwargs: { response_format: { type: "json_object" } } }
            : {}),
        }),
        modelId: spec.apiModelId,
      };
    }
    if (spec.vendor === "google" && process.env.GOOGLE_API_KEY) {
      return {
        tag: "google",
        model: new ChatGoogleGenerativeAI({
          model: spec.apiModelId,
          temperature: 0.2,
          ...(options?.jsonMode
            ? {
                modelKwargs: {
                  generationConfig: {
                    responseMimeType: "application/json",
                  },
                },
              }
            : {}),
        }),
        modelId: spec.apiModelId,
      };
    }
    if (spec.vendor === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      return {
        tag: "anthropic",
        model: new ChatAnthropic({
          model: spec.apiModelId,
          temperature: 0.2,
        }),
        modelId: spec.apiModelId,
      };
    }
  }

  const p = provider();
  if (p === "openai") {
    const modelId = resolveOpenAIModel(tier);
    return {
      tag: "openai",
      model: new ChatOpenAI({
        model: modelId,
        temperature: 0.2,
        ...(options?.jsonMode
          ? { modelKwargs: { response_format: { type: "json_object" } } }
          : {}),
      }),
      modelId,
    };
  }
  if (p === "google") {
    const modelId = resolveGoogleModel(tier);
    return {
      tag: "google",
      model: new ChatGoogleGenerativeAI({
        model: modelId,
        temperature: 0.2,
        ...(options?.jsonMode
          ? {
              modelKwargs: {
                generationConfig: {
                  responseMimeType: "application/json",
                },
              },
            }
          : {}),
      }),
      modelId,
    };
  }
  return { tag: "mock", modelId: tier === "economy" ? "gpt-4o-mini" : "mock" };
}

/** LangGraph 노드에서 `tier` + `vendorModelId`를 한 번에 넘길 때 사용 */
export function llmOptionsFromAgentState(state: {
  activeModelTier: ActiveModelTier;
  vendorModelId?: string;
}): CompleteTextOptions {
  const id = state.vendorModelId?.trim();
  return {
    tier: state.activeModelTier,
    ...(id ? { vendorModelId: id } : {}),
  };
}

function chunkTextFromMessage(chunk: AIMessageChunk): string {
  const c = chunk.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

export interface StreamTextTrackedOptions extends CompleteTextOptions {
  onChunk: (delta: string) => void;
}

/**
 * completeTextTracked 와 동일 프롬프트/모델 선택이며, 토큰 델타를 콜백으로 전달합니다.
 * (Progressive Learning UI — NDJSON 스트림과 결합)
 */
export async function streamTextTracked(
  system: string,
  user: string,
  options: StreamTextTrackedOptions,
): Promise<TrackedTextResult> {
  const onChunk = options.onChunk;
  const tier = options.tier ?? "standard";
  const backend = buildLlmBackend(options);

  if (backend.tag === "mock") {
    const text = mockComplete(system, user, options?.jsonMode);
    const chunkSize = 48;
    for (let i = 0; i < text.length; i += chunkSize) {
      onChunk(text.slice(i, i + chunkSize));
    }
    const mockId = tier === "economy" ? "gpt-4o-mini" : "mock";
    return {
      text,
      usage: { inputTokens: 420, outputTokens: 180, modelId: mockId, executionTimeMs: 12 },
    };
  }

  const live = backend as LiveLlmBackend;
  const { modelId } = live;
  const started = Date.now();
  const stream = await live.model.stream([
    new SystemMessage(system),
    new HumanMessage(user),
  ]);

  let text = "";
  let lastUsage: LlmUsageRecord = {
    inputTokens: 0,
    outputTokens: 0,
    modelId,
  };
  for await (const chunk of stream) {
    const piece = chunkTextFromMessage(chunk as AIMessageChunk);
    if (piece) {
      text += piece;
      onChunk(piece);
    }
    const u = chunk.usage_metadata;
    if (u) {
      lastUsage = {
        inputTokens: u.input_tokens ?? lastUsage.inputTokens,
        outputTokens: u.output_tokens ?? lastUsage.outputTokens,
        modelId,
        cachedTokensHit: readCachedTokens(u as unknown as Record<string, unknown>),
      };
    }
  }
  lastUsage.executionTimeMs = Date.now() - started;
  return { text, usage: lastUsage };
}

/**
 * 텍스트 + 토큰 사용량(가능 시). CFO 노드가 비용 집계에 사용합니다.
 */
export async function completeTextTracked(
  system: string,
  user: string,
  options?: CompleteTextOptions,
): Promise<TrackedTextResult> {
  const tier = options?.tier ?? "standard";
  const backend = buildLlmBackend(options);

  if (backend.tag === "mock") {
    const text = mockComplete(system, user, options?.jsonMode);
    const mockId = tier === "economy" ? "gpt-4o-mini" : "mock";
    return {
      text,
      usage: { inputTokens: 420, outputTokens: 180, modelId: mockId, executionTimeMs: 10 },
    };
  }

  const live = backend as LiveLlmBackend;
  const { modelId } = live;
  const started = Date.now();
  const res = await live.model.invoke([
    new SystemMessage(system),
    new HumanMessage(user),
  ]);
  const text =
    typeof res.content === "string" ? res.content : JSON.stringify(res.content);
  return { text, usage: readUsage(res, modelId, Date.now() - started) };
}

/** @deprecated 내부에서 completeTextTracked 사용 권장 */
export async function completeText(
  system: string,
  user: string,
  options?: CompleteTextOptions,
): Promise<string> {
  const { text } = await completeTextTracked(system, user, options);
  return text;
}

function mockComplete(system: string, user: string, jsonMode?: boolean): string {
  if (jsonMode) {
    if (system.includes(VALIDATE_SYSTEM_MARKER) || system.includes("검증")) {
      return JSON.stringify({
        score: 9,
        technicalAccuracy: "(목) KIT 용어는 원자료와 일치합니다.",
        goalAlignment: "(목) 멀티모달 AI 학습 파이프라인 주제와 정합합니다.",
        coverage: "(목) 핵심 목차가 반영되었습니다.",
        clarity: "(목) 학생 관점에서 문장 구조가 명확합니다.",
        rewriteInstructions: "",
        nextNode: "CFO_Agent",
      });
    }
    if (system.includes("퀴즈") || system.includes("quiz")) {
      return JSON.stringify({
        title: "(데모) 핵심 복습 퀴즈",
        questions: [
          {
            id: "q1",
            prompt: "이 노트는 어떤 환경에서 생성되었나요?",
            choices: ["OpenAI", "Google", "API 키 없음(목)", "없음"],
            correctAnswer: "API 키 없음(목)",
            explanation: "OPENAI_API_KEY 또는 GOOGLE_API_KEY를 설정하면 실제 LLM이 동작합니다.",
          },
        ],
      });
    }
    if (system.includes("PERSONA_ANIMATION_SCRIPT_V1")) {
      return JSON.stringify({
        persona_id: "shin-chan",
        title: "(목) 무령왕릉과 무영총 한바퀴",
        educational_topic: "백제 왕릉·유물 (맥락에 없으면 일반 박물관 설명)",
        scenes: [
          {
            scene_id: "s1",
            scene_description:
              "박물관 전시실, 유리 케이스 너머로 금제 관식이 보인다.",
            dialogue:
              '헤에~! 미스터~ 이 반짝이는 거, 왕이 쓰던 "핫" 아이템이래! 짱이야~',
            character_action_cues:
              "짧은 팔을 뻗어 유리에 코를 박을 뻔하고, 가이드가 살짝 당겨 세운다.",
          },
          {
            scene_id: "s2",
            scene_description: "클로즈업 인포 그래픽 — 무덤 단면 다이어그램.",
            dialogue:
              "무영총은 돌방 무덤이라서~ 비 올 때도 꽤 꿀잼 역사 스토리가 있대!",
            character_action_cues:
              "손가락으로 단면을 따라가며 고개를 끄덕인다.",
          },
        ],
      });
    }
    if (
      system.includes("Knowledge_Distiller") ||
      system.includes("study_note_markdown")
    ) {
      const nameMatch = /이름\(표시\):\s*([^\n]+)/.exec(user);
      const display = nameMatch?.[1]?.trim();
      const greet =
        display && display.length > 0 && !display.startsWith("(")
          ? `안녕하세요, ${display}님.`
          : "안녕하세요, Fellow Innovator님.";
      const empathy =
        "관심을 두신 지점이 **멀티모달 증류 파이프라인**과 맞닿아 있는 것 같아요.";
      const md = [
        greet,
        "",
        empathy,
        "",
        "## Foundation (기초)",
        "- (목 데이터) 원자료에서 추출한 핵심 주제를 요약합니다.",
        "- **KIT**: 한국기술교육대학 맥락.",
        "",
        "## Application (응용)",
        "- 입력 → 증류 → 검증 루프 → 튜터 순으로 학습 파이프라인이 구성됩니다.",
        "",
        "## Mastery (심화)",
        "- 체크포인터로 스레드 상태 유지; HITL 시 interruptBefore.",
      ].join("\n");
      const mdBeginner = [
        greet,
        "",
        empathy,
        "",
        "## Foundation (기초)",
        "- 강의를 **배달 앱**에 비유하면: 원자료만 배달상자에 담습니다.",
        "",
        "## Application (응용)",
        "- 파이프라인: 업로드 → 증류 → 검증 → 튜터.",
        "",
        "## Mastery (심화)",
        "- (원자료에서 다루지 않음) 세부 SLA.",
      ].join("\n");
      const mdStandard = md;
      const mdExpert = [
        greet,
        "",
        empathy,
        "",
        "## Foundation (기초)",
        "- Multimodal ingest; LangGraph state machine.",
        "",
        "## Application (응용)",
        "- Distill/validate loop; checkpointed `thread_id`.",
        "",
        "## Mastery (심화)",
        "- **RAG**: retrieve-augmented generation over PDF/video anchors.",
      ].join("\n");
      const pedagogy_pack = {
        user_learning_persona: "standard_kit",
        selected_persona_id: "standard_kit",
        selection_rationale: "(목) 사용자 페르소나가 standard_kit이므로 해당 변형을 채택.",
        avatar_tone_alignment:
          "Elite KIT Tutor: 명료·친절·격식; 아바타 호스트와 톤 정합.",
        variants: [
          {
            persona_id: "beginner_analogies",
            label: "초심자 · 비유",
            study_note_markdown: mdBeginner,
            tone_notes: "비유·짧은 문장",
          },
          {
            persona_id: "standard_kit",
            label: "표준 KIT",
            study_note_markdown: mdStandard,
            tone_notes: "강의실 기본 밀도",
          },
          {
            persona_id: "expert_technical",
            label: "전문가",
            study_note_markdown: mdExpert,
            tone_notes: "밀도↑, 전제 지식 가정",
          },
        ],
      };
      return JSON.stringify({
        agent: "Knowledge_Distiller",
        schema_version: "1.2",
        pedagogy_pack,
        distilled_data: {
          core_learning_objectives: [
            "멀티모달 자료에서 근거 있는 학습 노트를 구성한다.",
            "증류→검증 루프의 역할을 설명한다.",
          ],
          technical_concepts: [
            {
              concept: "멀티모달 RAG",
              why: "영상·PDF 근거를 함께 쓰면 환각을 줄인다.",
              how: "정렬 테이블로 인용 위치를 맞춘 뒤 요약에 반영한다.",
            },
          ],
          key_takeaways: [
            "원자료 밖 사실은 넣지 않는다.",
            "JSON 봉투로 구조화해 검증기가 파싱한다.",
          ],
          cot_reasoning:
            "1) 목표 추출 2) 용어 인벤토리 3) Why/How 정리 4) 갭 스캔 5) 마크다운 초안 6) 인용 7) self_check.",
          reasoning_rationale:
            "학습자 페르소나가 standard_kit으로 지정되어 구조적 밀도를 우선했습니다. MASTER CONTEXT에서 반복 등장한 멀티모달 증류·검증 루프를 핵심 축으로 배치했고, 원자료에 없는 심화 항목은 명시적으로 제한해 학습 혼선을 줄였습니다.",
        },
        study_note_markdown: mdStandard,
        self_check: {
          claims_grounded_in_materials_only: true,
          uncertain_segments_marked: true,
        },
      });
    }
    if (system.includes("T2V_PROMPT_ENGINE_VEO_SORA_V1")) {
      return JSON.stringify({
        model_hints: "16:9, 6s clips, no on-screen subtitles",
        global_style_bible:
          "1990s Japanese TV cel animation, bold outlines, flat colors, museum interior",
        scenes: [
          {
            scene_id: "s1",
            text_to_video_prompt:
              "Wide shot of a Korean history museum gallery, glass display case with gold crown ornaments glinting under warm spotlights, subtle camera dolly in, cel-shaded child character with thick outlines reacts with comedic awe, educational mood",
            negative_prompt: "gore, watermark, photoreal human teeth",
            suggested_duration_sec: 6,
            camera_notes: "slow dolly in, eye level",
            lighting_notes: "warm museum key, soft fill",
            character_consistency_tokens:
              "small boy, black hair, red shirt, simple shorts, thick line art",
            style_lock: "90s anime cel shading, saturated palette",
          },
          {
            scene_id: "s2",
            text_to_video_prompt:
              "Cut to animated cross-section diagram of an ancient stone chamber tomb, labels in Korean, same cel-shaded boy points at burial goods, camera slow pan right, educational infographic overlays",
            negative_prompt: "gore, skeleton detail, watermark",
            suggested_duration_sec: 6,
            camera_notes: "slow pan, slightly high angle",
            lighting_notes: "cool fill, diagram glow",
            character_consistency_tokens:
              "small boy, black hair, red shirt, thick line art",
            style_lock: "90s anime cel shading, saturated palette",
          },
        ],
      });
    }
    return JSON.stringify({ ok: true });
  }
  if (
    user.includes("MASTER CONTEXT") ||
    system.includes("증류") ||
    system.includes("Knowledge_Distiller")
  ) {
    return [
      "안녕하세요, Fellow Innovator님.",
      "",
      "관심을 두신 지점이 **학습 파이프라인**과 맞닿아 있는 것 같아요.",
      "",
      "## Foundation (기초)",
      "- (목 데이터) 원자료에서 추출한 핵심 주제를 요약합니다.",
      "",
      "## Application (응용)",
      "- KIT, 멀티모달 RAG, 체크포인터",
      "",
      "## Mastery (심화)",
      "- 입력 → 증류 → 검증 루프 → 튜터 순으로 학습 파이프라인이 구성됩니다.",
    ].join("\n");
  }
  if (system.includes("concise teaching")) {
    return "(mock) 컨텍스트에 기반한 간단 답변입니다.";
  }
  return "(mock LLM) API 키를 설정하면 실제 요약·검증이 수행됩니다.";
}
