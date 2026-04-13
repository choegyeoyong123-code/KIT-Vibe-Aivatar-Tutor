"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const outline: CSSProperties["fontVariationSettings"] =
  "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
const filled: CSSProperties["fontVariationSettings"] =
  "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";

export function MaterialSymbol({
  name,
  className,
  fill = false,
  style,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  /** Material Symbols 리그라필 이름 (예: settings, send) */
  name: string;
  fill?: boolean;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontVariationSettings: fill ? filled : outline,
        ...style,
      }}
      {...rest}
    >
      {name}
    </span>
  );
}
