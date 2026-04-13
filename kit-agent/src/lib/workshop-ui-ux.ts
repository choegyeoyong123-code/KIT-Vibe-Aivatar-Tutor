/**
 * 워크숍 풀 UI/UX (글래스·펄스·블러 등).
 * `NEXT_PUBLIC_WORKSHOP_UI_UX=0` 이면 저부하 모드(`data-workshop-ui-ux="off"`).
 */
export type WorkshopUiUxLevel = "on" | "off";

export function getWorkshopUiUxLevel(): WorkshopUiUxLevel {
  if (process.env.NEXT_PUBLIC_WORKSHOP_UI_UX === "0") return "off";
  return "on";
}

export function workshopUiUxHtmlProps(): { "data-workshop-ui-ux": WorkshopUiUxLevel } {
  return { "data-workshop-ui-ux": getWorkshopUiUxLevel() };
}
