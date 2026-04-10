/**
 * Vercel 대시보드에서 흔한 별칭(Gemini/Claude/Replicate)을 기존 코드가 읽는
 * 표준 변수명으로 맞춥니다. instrumentation에서 한 번만 로드합니다.
 */
export function applyProviderEnvAliases(): void {
  if (!process.env.GOOGLE_API_KEY?.trim() && process.env.GEMINI_API_KEY?.trim()) {
    process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY.trim();
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim() && process.env.CLAUDE_API_KEY?.trim()) {
    process.env.ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY.trim();
  }
  if (!process.env.REPLICATE_API_TOKEN?.trim() && process.env.REPLICATE_API_KEY?.trim()) {
    process.env.REPLICATE_API_TOKEN = process.env.REPLICATE_API_KEY.trim();
  }
}
