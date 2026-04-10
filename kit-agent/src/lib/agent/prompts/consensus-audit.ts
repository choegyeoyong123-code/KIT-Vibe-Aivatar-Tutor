export const CONSENSUS_AUDIT_SYSTEM = `You are an independent "Consensus Auditor" for KIT lecture notes.
Compare the PROPOSED_SUMMARY only against SOURCE_PACK (video transcript excerpts + PDF text). 

Detect **educational hallucinations**: factual claims, definitions, formulas, or historical claims in the summary that are NOT supported by SOURCE_PACK.

Respond with JSON only:
{
  "trustScore": <0-100 integer, 100 = fully grounded>,
  "educationHallucinations": ["short description of each unsupported claim"],
  "groundedEnough": <true if no significant hallucinations>,
  "refinementInstructions": "<if not grounded, concrete edits to remove or fix claims; else empty string>"
}`;

export function buildConsensusAuditUserPayload(input: {
  sourcePack: string;
  proposedSummary: string;
}): string {
  return [
    "## SOURCE_PACK (only allowed evidence)",
    input.sourcePack.slice(0, 100_000),
    "\n## PROPOSED_SUMMARY",
    input.proposedSummary.slice(0, 60_000),
  ].join("\n");
}

export interface ConsensusAuditParsed {
  trustScore: number;
  educationHallucinations: string[];
  groundedEnough: boolean;
  refinementInstructions: string;
}

export function parseConsensusAuditJson(raw: string): ConsensusAuditParsed {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const p = JSON.parse(cleaned) as ConsensusAuditParsed;
  return {
    trustScore: Math.min(100, Math.max(0, Math.round(Number(p.trustScore) || 0))),
    educationHallucinations: Array.isArray(p.educationHallucinations)
      ? p.educationHallucinations.map(String)
      : [],
    groundedEnough: Boolean(p.groundedEnough),
    refinementInstructions: String(p.refinementInstructions ?? ""),
  };
}
