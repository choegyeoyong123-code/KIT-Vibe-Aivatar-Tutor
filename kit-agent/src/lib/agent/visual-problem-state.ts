import { Annotation } from "@langchain/langgraph";
import type { CreativeIntent } from "@/lib/agent/creative/types";
import type { FeedbackLogEntry } from "@/lib/agent/types";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";
import type { VisualGroundingResult } from "@/lib/vision/types";

export const VisualProblemStateAnnotation = Annotation.Root({
  filename: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  visualGrounding: Annotation<VisualGroundingResult | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  creativeIntent: Annotation<CreativeIntent>({
    reducer: (_left, right) => right,
    default: () => "quiz",
  }),
  userGoal: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  creativeOutputJson: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  currentQuestion: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  answerRubric: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  studentAnswer: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  lastEvaluationCorrect: Annotation<boolean | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  evaluationFeedback: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  hintLevel: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  problemsSolved: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  problemsPresented: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  maxProblems: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 3,
  }),
  tutorHint: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  sessionComplete: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  feedbackLog: Annotation<FeedbackLogEntry[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  lastLlmUsage: Annotation<LlmUsageRecord | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  totalTokenUsage: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  accumulatedCost: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  estimatedCost: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
});

export type VisualProblemState = typeof VisualProblemStateAnnotation.State;
