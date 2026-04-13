"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type WorkshopBreakpoint = "mobile" | "tablet" | "desktop";

const MOBILE_MAX = 639;
const TABLET_MAX = 1023;

function resolveBreakpoint(width: number): WorkshopBreakpoint {
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

/**
 * Responsive Guard — Mobile (&lt;640), Tablet (640–1024), Desktop (&gt;1024).
 * SSR 시점에는 `desktop` 가정 후 클라이언트에서 즉시 동기화해 레이아웃 시프트를 최소화합니다.
 */
export function useResponsiveGuard() {
  const [width, setWidth] = useState(1200);

  const onResize = useCallback(() => {
    if (typeof window === "undefined") return;
    setWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [onResize]);

  const breakpoint = useMemo(() => resolveBreakpoint(width), [width]);

  return useMemo(
    () => ({
      width,
      breakpoint,
      isMobile: breakpoint === "mobile",
      isTablet: breakpoint === "tablet",
      isDesktop: breakpoint === "desktop",
    }),
    [width, breakpoint],
  );
}
