import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState } from "@/lib/agent/state";
import { getCheckpointer } from "@/lib/agent/checkpointer";
import { inputNode } from "@/lib/agent/nodes/input";
import { personaManagerNode } from "@/lib/agent/nodes/persona-manager";
import { crossModalAlignNode } from "@/lib/agent/nodes/cross-modal-align";
import { distillerNode } from "@/lib/agent/nodes/distiller";
import { validatorNode } from "@/lib/agent/nodes/validator";
import { consensusAuditorNode } from "@/lib/agent/nodes/consensus-auditor";
import { tutorNode } from "@/lib/agent/nodes/tutor";
import {
  cfoAfterDistillNode,
  cfoAfterValidateNode,
  cfoAfterTutorNode,
} from "@/lib/agent/nodes/cfo";
import { hitlPrepareNode } from "@/lib/agent/nodes/hitl-prepare";
import { policyLearnerNode } from "@/lib/agent/nodes/policy-learner";
import { humanInterruptNode } from "@/lib/agent/nodes/human-interrupt";
import { adminAgentNode } from "@/lib/agent/nodes/admin-agent";
import { exitProcessorNode } from "@/lib/agent/nodes/exit-processor";
import {
  HITL_LOOP_THRESHOLD,
  MAX_DISTILL_ROUNDS,
  QUALITY_PASS_THRESHOLD,
} from "@/lib/agent/constants";

/**
 * Input → Align → Distill → CFO → Validate → Consensus → CFO → Admin → HITL → Policy
 * → (interrupt) …
 */
// Strategy 7–8: score < 9 → distill until caps; Strategy 8: loopCount≥3 & score<9 → no further distill (tutor).
function routeAfterValidate(state: AgentState): "distill" | "tutor" {
  const score = state.qualityScore ?? 0;
  const rounds = state.distillRound ?? 0;
  const loops = state.loopCount ?? 0;
  if (score >= QUALITY_PASS_THRESHOLD) return "tutor";
  if (rounds >= MAX_DISTILL_ROUNDS) return "tutor";
  if (loops >= HITL_LOOP_THRESHOLD && score < QUALITY_PASS_THRESHOLD) return "tutor";
  return "distill";
}

function routeAfterConsensus(state: AgentState): "distill" | "cfo_validate" {
  if (state.auditorRefinementRequired) return "distill";
  return "cfo_validate";
}

function routeAfterHitlPrepare(
  state: AgentState,
): "waiting_for_approval" | "distill" | "tutor" {
  if (state.hitlPending) return "waiting_for_approval";
  return routeAfterValidate(state);
}

type HumanBranch = "exit_processor" | "distill" | "tutor" | "graph_end";

function routeAfterHuman(state: AgentState): HumanBranch {
  if (state.hitlNextRoute === "exit_processor") return "exit_processor";
  if (state.hitlNextRoute === "workflow") return routeAfterValidate(state);
  return "graph_end";
}

type ExitBranch = "distill" | "graph_end";

function routeAfterExitProcessor(state: AgentState): ExitBranch {
  if (state.exitProcessorNext === "distill") return "distill";
  return "graph_end";
}

export function buildLearningGraph() {
  return new StateGraph(AgentStateAnnotation)
    .addNode("input", inputNode)
    .addNode("persona_manager", personaManagerNode)
    .addNode("cross_modal_align", crossModalAlignNode)
    .addNode("distill", distillerNode)
    .addNode("cfo_distill", cfoAfterDistillNode)
    .addNode("validate", validatorNode)
    .addNode("consensus_auditor", consensusAuditorNode)
    .addNode("cfo_validate", cfoAfterValidateNode)
    .addNode("admin_agent", adminAgentNode)
    .addNode("hitl_prepare", hitlPrepareNode)
    .addNode("policy_learner", policyLearnerNode)
    .addNode("waiting_for_approval", humanInterruptNode)
    .addNode("exit_processor", exitProcessorNode)
    .addNode("tutor", tutorNode)
    .addNode("cfo_tutor", cfoAfterTutorNode)
    .addEdge(START, "input")
    .addEdge("input", "persona_manager")
    .addEdge("persona_manager", "cross_modal_align")
    .addEdge("cross_modal_align", "distill")
    .addEdge("distill", "cfo_distill")
    .addEdge("cfo_distill", "validate")
    .addEdge("validate", "consensus_auditor")
    .addConditionalEdges("consensus_auditor", routeAfterConsensus, {
      distill: "distill",
      cfo_validate: "cfo_validate",
    })
    .addEdge("cfo_validate", "admin_agent")
    .addEdge("admin_agent", "hitl_prepare")
    .addEdge("hitl_prepare", "policy_learner")
    .addConditionalEdges("policy_learner", routeAfterHitlPrepare, {
      waiting_for_approval: "waiting_for_approval",
      distill: "distill",
      tutor: "tutor",
    })
    .addConditionalEdges("waiting_for_approval", routeAfterHuman, {
      exit_processor: "exit_processor",
      distill: "distill",
      tutor: "tutor",
      graph_end: END,
    })
    .addConditionalEdges("exit_processor", routeAfterExitProcessor, {
      distill: "distill",
      graph_end: END,
    })
    .addEdge("tutor", "cfo_tutor")
    .addEdge("cfo_tutor", END);
}

let compiled:
  | ReturnType<ReturnType<typeof buildLearningGraph>["compile"]>
  | null = null;

export function resetLearningGraphCache() {
  compiled = null;
}

export function getCompiledLearningGraph() {
  if (!compiled) {
    compiled = buildLearningGraph().compile({
      checkpointer: getCheckpointer(),
      interruptBefore: ["waiting_for_approval"],
    });
  }
  return compiled;
}
