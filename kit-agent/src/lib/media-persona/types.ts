/**
 * Phase 1: 페르소나 교육 애니메이션 스크립트 (JSON).
 * 필드명은 API 스펙과 동일하게 유지 (scene_description = Scene_Description 의미).
 */
export type PersonaId = "shin-chan" | "neutral-educator";

export interface PersonaAnimationScene {
  scene_id: string;
  scene_description: string;
  dialogue: string;
  character_action_cues: string;
}

export interface PersonaAnimationScript {
  persona_id: PersonaId;
  title: string;
  educational_topic: string;
  scenes: PersonaAnimationScene[];
}

/** Phase 2: 텍스트-투-비디오용 고해상도 프롬프트 */
export interface TextToVideoScenePrompt {
  scene_id: string;
  text_to_video_prompt: string;
  negative_prompt?: string;
  suggested_duration_sec: number;
  camera_notes: string;
  lighting_notes: string;
  character_consistency_tokens: string;
  style_lock: string;
}

export interface TextToVideoPromptPack {
  model_hints: string;
  global_style_bible: string;
  scenes: TextToVideoScenePrompt[];
}

export interface MediaCostBreakdown {
  phase12LlmUsd: number;
  phase3VideoEstimateUsd: number;
  phase3TtsEstimateUsd: number;
  phase3TotalEstimateUsd: number;
  grandTotalEstimateUsd: number;
}

export interface MediaRenderManifest {
  jobId: string;
  personaId: PersonaId;
  createdAt: string;
  script: PersonaAnimationScript;
  videoPrompts: TextToVideoPromptPack;
  sceneAudioPaths: string[];
  combinedAudioPath: string | null;
  mp4Path: string | null;
  ffmpegAvailable: boolean;
  hitlRequired: boolean;
  costs: MediaCostBreakdown & {
    ttsActualUsdEstimate?: number;
  };
}
