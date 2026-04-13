import type { Config } from "tailwindcss";

/**
 * Tailwind v4 + `@tailwindcss/postcss` 환경에서는 **토큰·폰트 확장이 `src/app/globals.css`의
 * `@theme inline`** 에서 이루어집니다. STITCH `code.html`의 tailwind-config 블록은 해당 파일에
 * `pw-*` (Pristine Workshop) 접두사로 병합했습니다.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
} satisfies Config;
