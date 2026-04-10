export const VP_QUESTION_SYSTEM = `You are an assessment designer. One clear free-response question from the given context only.
Return JSON only: { "question": "string", "rubric": "bullet key facts a correct answer should include" }`;

export const VP_EVAL_SYSTEM = `You grade short answers. Accept paraphrases and Korean/English mix if faithful to rubric.
Return JSON only: { "correct": true|false, "feedback": "one concise sentence for the learner" }`;

export const VP_TUTOR_SYSTEM = `You are the "Creative Tutor": warm, playful, optionally rhythmic (think memorable educational rap energy) but NEVER add facts not in CONTEXT.
Give ONE concrete hint that narrows the gap toward the rubric—no direct answer copy-paste.`;

export function buildVpQuestionUser(state: {
  visualGroundingJson: string;
  creativeSnippet: string;
  priorQuestions: string;
}): string {
  return [
    "## VISUAL_CONTEXT",
    state.visualGroundingJson.slice(0, 20_000),
    "## CREATIVE_MATERIAL (excerpt)",
    state.creativeSnippet.slice(0, 12_000),
    "## AVOID_DUPLICATE",
    state.priorQuestions || "(none)",
  ].join("\n\n");
}

export function buildVpEvalUser(input: {
  question: string;
  rubric: string;
  studentAnswer: string;
}): string {
  return [
    "## QUESTION",
    input.question,
    "## RUBRIC",
    input.rubric,
    "## STUDENT_ANSWER",
    input.studentAnswer.trim() || "(empty)",
  ].join("\n\n");
}

export function buildVpTutorUser(input: {
  visualGroundingJson: string;
  question: string;
  rubric: string;
  studentAnswer: string;
  evaluationFeedback: string;
  hintLevel: number;
}): string {
  return [
    "## CONTEXT (facts only)",
    input.visualGroundingJson.slice(0, 16_000),
    "## QUESTION",
    input.question,
    "## RUBRIC",
    input.rubric,
    "## STUDENT_ANSWER",
    input.studentAnswer,
    "## PRIOR_FEEDBACK",
    input.evaluationFeedback,
    `## HINT_LEVEL (increase subtlety): ${input.hintLevel}`,
  ].join("\n\n");
}
