import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEducationalPersonaById } from "@/constants/personas";
import type { EducationalPersonaId } from "@/constants/personas";
import type { LogicGraphJson } from "@/lib/visual-lab/logic-graph-schema";
import {
  RaceAudioScriptResultSchema,
  type RaceAudioScriptResult,
  type RaceContentSource,
  type VoiceDna,
} from "@/lib/visual-lab/race-audio-schema";

const RACE_MODEL = process.env.GOOGLE_RACE_AUDIO_MODEL ?? "gemini-1.5-flash";

/**
 * RACE 프롬프트 체인 — **코드에서의 4단계**(단일 LLM 호출 전 컨텍스트 합성 + 1회 생성).
 * - **R**etrieve: Logic JSON + Voice DNA + 콘텐츠 소스 정규화
 * - **A**lign: 페르소나 비유를 Voice DNA(속도·톤·피치 힌트)에 맞게 정렬할 지시
 * - **C**ompose: 1인칭 한국어 나레이션 (~30초 분량)
 * - **E**ncode: `<speak>` SSML(prosody, break, emphasis)로 래핑
 */
function buildRaceChainedUserPayload(input: {
  logic: LogicGraphJson;
  voiceDna: VoiceDna;
  personaId: EducationalPersonaId;
  content: RaceContentSource;
}): string {
  const persona = getEducationalPersonaById(input.personaId);
  const personaCard = {
    id: input.personaId,
    name: persona?.name,
    emoji: persona?.emoji,
    shortDescription: persona?.shortDescription,
    emotionalLine: persona?.emotionalLine,
    greetingMain: persona?.greetingMain,
  };

  const voiceBlock = {
    pitch_hz_estimate: input.voiceDna.pitch_hz_estimate ?? null,
    pitch_qualitative: input.voiceDna.pitch_qualitative ?? "",
    tone_descriptors: input.voiceDna.tone_descriptors ?? [],
    speaking_rate: input.voiceDna.speaking_rate ?? "moderate",
    tts_instructions_en: input.voiceDna.tts_instructions_en ?? "",
  };

  return JSON.stringify(
    {
      race_stage_R_retrieve: {
        logic_json: input.logic,
        voice_dna: voiceBlock,
        persona_card: personaCard,
        content_source: input.content,
      },
      race_stage_A_align: `페르소나(${persona?.name})의 비유·톤을 유지하되, Voice DNA의 speaking_rate·tone_descriptors·pitch_qualitative에 맞춰 문장 리듬과 어휘 난이도를 조정하세요. tts_instructions_en은 **한국어 대본에 직접 노출하지 말고** 리듬·감정만 반영하세요.`,
      race_stage_C_compose: `전체 나레이션은 **반드시 1인칭**(예: "내가 작성한 이 코드는…", "제가 여기서 놓치기 쉬웠던 점은…"). 복잡한 로직은 Logic JSON의 core_logic·key_entities·logic_gaps를 근거로 설명하세요. 길이는 **읽기 약 30초**.`,
      race_stage_E_encode: `Google Cloud Text-to-Speech 호환 SSML만 사용: 루트 <speak xml:lang="ko-KR">…</speak>. 허용 태그 예: <prosody rate="slow"|"medium"|"fast" pitch="+1st"|"-1st"|"+0st">…</prosody>, <break time="300ms"/>, <emphasis level="moderate">…</emphasis>. 속도·피치는 Voice DNA와 내용 강조에 맞게 **2~4구간**으로 나누세요.`,
      output_contract: {
        format: "application/json",
        schema: {
          ssml_script: "string — 전체 SSML 한 덩어리",
          plain_script_ko: "string — SSML 태그를 제거한 동일 한국어 텍스트(자막용)",
          estimated_seconds: "number 22-38",
          race_trace: {
            retrieve: "한 줄 요약",
            align: "한 줄 요약",
            compose: "한 줄 요약",
            encode: "한 줄 요약",
          },
        },
      },
    },
    null,
    2,
  );
}

const RACE_SYSTEM = `You are a Multi-modal Content Architect for an educational product.
You MUST follow the RACE stages described in the user JSON: retrieve facts from logic_json + voice_dna, align persona voice with the learner's linguistic style, compose first-person Korean, encode as SSML.

Hard rules:
- Korean only inside SSML text nodes (except xml:lang attribute).
- First person throughout (나/내가/제가/우리 팀이 — 상황에 맞게 일관).
- No markdown fences in output — JSON only.
- SSML must be well-formed XML: escape < > & in text as &lt; &gt; &amp; if needed (prefer avoiding raw symbols in speech).
- Do not paste tts_instructions_en verbatim into spoken Korean; use it only to tune prosody choices.
- Total listening time target: **30 seconds** (estimated_seconds ~28-32).`;

function mockRaceResult(content: RaceContentSource): RaceAudioScriptResult {
  const intro =
    content.kind === "quiz"
      ? `내가 방금 풀었던 퀴즈는, ${content.summary.slice(0, 80)}… 와 맞닿아 있어.`
      : `내가 작성한 이 코드는, ${content.body.slice(0, 80)}… 의 흐름을 한 줄로 잡아 주는 핵심이야.`;

  const plain = [
    intro,
    "논리 그래프에서 말한 흐름을 내 말투로 다시 짚어 보면, 데이터는 들어와서 처리되고, 중요한 분기에서 방향이 갈려.",
    "내 목소리 DNA에 맞춰 천천히 말하자면, 여기서는 속도를 살짝 늦추고 강조만 또렷하게 가져가면 돼.",
  ].join(" ");

  const ssml = `<speak xml:lang="ko-KR">
  <prosody rate="medium" pitch="+0st">${intro}</prosody>
  <break time="320ms"/>
  <prosody rate="slow" pitch="-0.5st">논리 그래프에서 말한 흐름을 내 말투로 다시 짚어 보면, 데이터는 들어와서 처리되고, 중요한 분기에서 방향이 갈려.</prosody>
  <break time="280ms"/>
  <prosody rate="medium" pitch="+0.5st"><emphasis level="moderate">내 목소리 DNA</emphasis>에 맞춰 천천히 말하자면, 여기서는 속도를 살짝 늦추고 강조만 또렷하게 가져가면 돼.</prosody>
</speak>`;

  return {
    ssml_script: ssml,
    plain_script_ko: plain,
    estimated_seconds: 30,
    race_trace: {
      retrieve: "데모: Logic JSON + Voice DNA 블록을 읽었습니다.",
      align: "데모: 페르소나 비유를 보이스 속도에 맞췄습니다.",
      compose: "데모: 1인칭 3문장 구성.",
      encode: "데모: prosody/break/emphasis SSML 적용.",
    },
  };
}

export type SynthesizeRaceAudioScriptResult = {
  result: RaceAudioScriptResult;
  demo: boolean;
  modelId: string;
};

/**
 * Logic JSON(Visual Lab) + Voice DNA(Analyzer) + 교육 페르소나 + 퀴즈/코드 설명 → 30초 내외 SSML 오디오 스크립트.
 */
export async function synthesizeRaceChainedAudioScript(input: {
  logic: LogicGraphJson;
  voiceDna: VoiceDna;
  personaId: EducationalPersonaId;
  content: RaceContentSource;
}): Promise<SynthesizeRaceAudioScriptResult> {
  if (!process.env.GOOGLE_API_KEY) {
    return {
      result: mockRaceResult(input.content),
      demo: true,
      modelId: "mock",
    };
  }

  const gen = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gen.getGenerativeModel({
    model: RACE_MODEL,
    systemInstruction: RACE_SYSTEM,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const user = buildRaceChainedUserPayload(input);
  const res = await model.generateContent(user);
  const raw = res.response.text()?.trim() ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      result: mockRaceResult(input.content),
      demo: true,
      modelId: RACE_MODEL,
    };
  }

  const safe = RaceAudioScriptResultSchema.safeParse(parsed);
  if (!safe.success) {
    return {
      result: mockRaceResult(input.content),
      demo: true,
      modelId: RACE_MODEL,
    };
  }

  return { result: safe.data, demo: false, modelId: RACE_MODEL };
}
