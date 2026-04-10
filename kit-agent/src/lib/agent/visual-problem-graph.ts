import { StateGraph, START, END } from "@langchain/langgraph";
import {
  VisualProblemStateAnnotation,
  type VisualProblemState,
} from "@/lib/agent/visual-problem-state";
import { getCheckpointer } from "@/lib/agent/checkpointer";
import {
  vpAwaitAnswerNode,
  vpCreativeNode,
  vpEvaluateNode,
  vpGenQuestionNode,
  vpTutorNode,
} from "@/lib/agent/nodes/visual-problem-nodes";

function routeAfterEvaluate(
  state: VisualProblemState,
): "tutor" | "gen_question" | "end" {
  if (state.lastEvaluationCorrect === false) return "tutor";
  if ((state.problemsSolved ?? 0) >= (state.maxProblems ?? 3)) return "end";
  return "gen_question";
}

/**
 * 시각 컨텍스트 → 크리에이티브 콘텐츠 → 출제 → (interrupt) 응답·채점 → 힌트 또는 다음 문항.
 */
export function buildVisualProblemGraph() {
  return new StateGraph(VisualProblemStateAnnotation)
    .addNode("vp_creative", vpCreativeNode)
    .addNode("vp_gen_question", vpGenQuestionNode)
    .addNode("vp_await_answer", vpAwaitAnswerNode)
    .addNode("vp_evaluate", vpEvaluateNode)
    .addNode("vp_tutor", vpTutorNode)
    .addEdge(START, "vp_creative")
    .addEdge("vp_creative", "vp_gen_question")
    .addEdge("vp_gen_question", "vp_await_answer")
    .addEdge("vp_await_answer", "vp_evaluate")
    .addConditionalEdges("vp_evaluate", routeAfterEvaluate, {
      tutor: "vp_tutor",
      gen_question: "vp_gen_question",
      end: END,
    })
    .addEdge("vp_tutor", "vp_await_answer");
}

let compiled:
  | ReturnType<ReturnType<typeof buildVisualProblemGraph>["compile"]>
  | null = null;

export function getCompiledVisualProblemGraph() {
  if (!compiled) {
    compiled = buildVisualProblemGraph().compile({
      checkpointer: getCheckpointer(),
      interruptBefore: ["vp_await_answer"],
    });
  }
  return compiled;
}
