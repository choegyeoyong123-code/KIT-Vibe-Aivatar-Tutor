import { cn } from "@/lib/utils";

/** 섹션 구분 — 순백 위 연한 테두리만 (그림자 없음) */
export const kitSurfaceBorder = "border-2 border-gray-100";

/**
 * 기능 카드 — 흰 배경, border-2 gray-100 (Clean & Chunky)
 */
export function glassPanelClass(opts?: {
  hover?: boolean;
  rounded?: "xl" | "2xl" | "3xl";
}) {
  const r = opts?.rounded ?? "2xl";
  const rounded =
    r === "xl" ? "rounded-xl" : r === "3xl" ? "rounded-3xl" : "rounded-2xl";
  return cn(
    "relative overflow-hidden border-2 border-gray-100 bg-white",
    rounded,
    opts?.hover && "transition-colors duration-200 hover:border-gray-200",
  );
}

/** 루트 페이지 셸 — 순백 배경 */
export const pageShellClass =
  "relative flex min-h-full flex-col bg-white text-[#4B4B4B]";

/** 좌·우 보조 레일 — 화이트 유지, 테두리만으로 구분 (듀오링고식) */
export const kitSidebarRailClass =
  "border-gray-100 bg-white";
