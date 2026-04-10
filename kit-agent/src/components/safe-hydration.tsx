"use client";

import type { ReactNode } from "react";
import { useIsMounted } from "@/hooks/use-is-mounted";

export function SafeHydration({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const mounted = useIsMounted();
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

