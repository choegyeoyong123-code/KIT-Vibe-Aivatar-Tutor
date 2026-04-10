import type { QuizQuestion } from "@/lib/agent/types";

export type CreativeIntent = "quiz" | "rap" | "video_script";

export interface CreativeQuizOutput {
  kind: "quiz";
  title: string;
  questions: QuizQuestion[];
}

export interface CreativeRapOutput {
  kind: "rap";
  title: string;
  hook: string;
  verses: string[];
  outro?: string;
  teachingObjective: string;
}

export interface CreativeVideoScriptScene {
  beat: string;
  narration: string;
  onScreenVisuals: string;
}

export interface CreativeVideoScriptOutput {
  kind: "video_script";
  title: string;
  estimatedDurationSec: number;
  scenes: CreativeVideoScriptScene[];
}

export type CreativeEducationalPayload =
  | CreativeQuizOutput
  | CreativeRapOutput
  | CreativeVideoScriptOutput;
