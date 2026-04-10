"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";
import {
  PERSONA_IMAGE_BLUR,
  PERSONA_IMAGE_INTRINSIC,
} from "@/lib/persona-gallery/persona-image-assets.generated";

const ASSET_BASE = "/images/personas";

export type PersonaMentorImageProps = {
  personaId: DynamicPersonaId;
  /** 첫 4장은 LCP 최적화를 위해 true 권장 */
  priority?: boolean;
  className?: string;
};

/**
 * WebP(Next Image 최적화·AVIF 협상) + LQIP blur.
 * 고정 88×88 표시로 CLS 방지, `sizes`로 디바이스 픽셀 비율 대응.
 */
export function PersonaMentorImage({
  personaId,
  priority = false,
  className,
}: PersonaMentorImageProps) {
  const blur = PERSONA_IMAGE_BLUR[personaId];

  return (
    <span
      className={cn(
        "relative inline-flex size-[88px] shrink-0 items-center justify-center",
        className,
      )}
      style={{ aspectRatio: "1 / 1" }}
    >
      <Image
        src={`${ASSET_BASE}/${personaId}.webp`}
        alt=""
        width={PERSONA_IMAGE_INTRINSIC.width}
        height={PERSONA_IMAGE_INTRINSIC.height}
        priority={priority}
        placeholder="blur"
        blurDataURL={blur}
        sizes="(max-width:640px) 28vw, 88px"
        className="size-[88px] object-contain object-center"
        quality={85}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "low"}
      />
    </span>
  );
}
