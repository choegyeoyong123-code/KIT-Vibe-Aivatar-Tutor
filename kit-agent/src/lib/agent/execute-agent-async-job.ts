import { INTERRUPT, isInterrupted } from "@langchain/langgraph";
import { learningGraphInitialFields } from "@/lib/agent/initial-run-state";
import { getAgentAsyncJob, patchAgentAsyncJob } from "@/lib/agent/agent-job-store";

const inFlight = new Set<string>();

/**
 * Strategy 11: 큐에서 running으로 넘긴 뒤 LangGraph 전체 invoke.
 * Vercel Free 10s 제한을 피하려면 이 함수는 `after()` 또는 별도 긴 maxDuration 라우트에서 호출하세요.
 */
export async function executeAgentAsyncJob(jobId: string): Promise<void> {
  if (inFlight.has(jobId)) return;
  const job = getAgentAsyncJob(jobId);
  if (!job || job.status !== "running") return;
  inFlight.add(jobId);

  try {
    const { getCompiledLearningGraph } = await import("@/lib/agent/graph");
    const graph = getCompiledLearningGraph();
    const state = await graph.invoke(
      {
        ...learningGraphInitialFields,
        originalMaterials: job.materials,
        summarizationInstruction: job.summarizationInstruction,
        learningPersona: job.learningPersona,
        studentDisplayName: job.studentDisplayName,
        currentPersonaId: job.galleryPersonaId,
        educationalPersonaSystemPrompt: job.educationalPersonaSystemPrompt ?? "",
        activeModelTier: job.activeModelTier ?? "standard",
        vendorModelId: job.vendorModelId ?? "",
      },
      { configurable: { thread_id: job.threadId } },
    );

    if (isInterrupted(state)) {
      const snapshot = await graph.getState({
        configurable: { thread_id: job.threadId },
      });
      patchAgentAsyncJob(jobId, {
        status: "interrupted",
        state: snapshot.values,
        interrupts: state[INTERRUPT],
      });
      return;
    }

    patchAgentAsyncJob(jobId, { status: "completed", state });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    patchAgentAsyncJob(jobId, {
      status: "failed",
      error: msg,
    });
  } finally {
    inFlight.delete(jobId);
  }
}
