import type { VisualProblemState } from "@/lib/agent/visual-problem-state";
import type { VisualProblemSessionSnapshot } from "@/lib/visual-lab/session-snapshot";

export function toVisualProblemSnapshot(
  state: VisualProblemState,
): VisualProblemSessionSnapshot {
  return {
    filename: state.filename,
    visualGrounding: state.visualGrounding,
    creativeIntent: state.creativeIntent,
    userGoal: state.userGoal,
    creativeOutputJson: state.creativeOutputJson,
    currentQuestion: state.currentQuestion,
    answerRubric: state.answerRubric,
    tutorHint: state.tutorHint,
    hintLevel: state.hintLevel,
    problemsSolved: state.problemsSolved,
    problemsPresented: state.problemsPresented,
    maxProblems: state.maxProblems,
    sessionComplete: state.sessionComplete,
    lastEvaluationCorrect: state.lastEvaluationCorrect,
    evaluationFeedback: state.evaluationFeedback,
    feedbackLog: state.feedbackLog,
    totalTokenUsage: state.totalTokenUsage,
    accumulatedCost: state.accumulatedCost,
    estimatedCost: state.estimatedCost,
  };
}
