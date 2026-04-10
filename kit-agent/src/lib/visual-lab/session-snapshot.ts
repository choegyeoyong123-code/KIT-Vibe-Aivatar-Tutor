import type { CreativeIntent } from "@/lib/agent/creative/types";
import type { FeedbackLogEntry } from "@/lib/agent/types";
import type { VisualGroundingResult } from "@/lib/vision/types";

/** 시각 세션 API JSON (클라이언트·서버 공용, LangGraph 비의존) */
export interface VisualProblemSessionSnapshot {
  filename: string;
  visualGrounding: VisualGroundingResult | null;
  creativeIntent: CreativeIntent;
  userGoal: string;
  creativeOutputJson: string;
  currentQuestion: string;
  answerRubric: string;
  tutorHint: string;
  hintLevel: number;
  problemsSolved: number;
  problemsPresented: number;
  maxProblems: number;
  sessionComplete: boolean;
  lastEvaluationCorrect: boolean | null;
  evaluationFeedback: string;
  feedbackLog: FeedbackLogEntry[];
  totalTokenUsage: number;
  accumulatedCost: number;
  estimatedCost: number;
}
