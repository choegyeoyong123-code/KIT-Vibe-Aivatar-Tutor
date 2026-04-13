"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clapperboard, ImageIcon, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EDUCATIONAL_PERSONAS } from "@/constants/personas";
import { useEducationalPersona } from "@/components/educational-persona-context";
import { useWorkshopExperienceOptional } from "@/components/workshop-experience-context";
import { SpringDialogSurface } from "@/components/spring-dialog-surface";

export type WorkshopMobileDockProps = {
  onOpenVisualLab?: () => void;
  onOpenMediaStudio?: () => void;
  visualBusy?: boolean;
  mediaBusy?: boolean;
};

/** lg 미만 하단 내비 + 튜터 드로어. props가 없으면 WorkshopExperience 홈 시뮬레이션에 연결됩니다. */
export function WorkshopMobileDock({
  onOpenVisualLab: onOpenVisualLabProp,
  onOpenMediaStudio: onOpenMediaStudioProp,
  visualBusy: visualBusyProp,
  mediaBusy: mediaBusyProp,
}: WorkshopMobileDockProps = {}) {
  const ctx = useWorkshopExperienceOptional();
  const { selectedPersona, selectPersona } = useEducationalPersona();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const noop = () => {};
  const onOpenVisualLab =
    onOpenVisualLabProp ?? ctx?.startVisualLabSimulation ?? noop;
  const onOpenMediaStudio =
    onOpenMediaStudioProp ?? ctx?.startMediaStudioSimulation ?? noop;

  const visualBusy =
    visualBusyProp ?? (ctx ? ctx.visualLabPhase === "analyzing" : false);
  const mediaBusy = mediaBusyProp ?? (ctx?.mediaStudioBusy ?? false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[60] flex border-t-2 border-gray-100 bg-white/95 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_0_0_rgb(229_231_235)] lg:hidden kit-mobile-reduce-blur backdrop-blur-md"
        aria-label="워크숍 하단 메뉴"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-1">
          <motion.button
            type="button"
            whileTap={{ y: 2, scale: 0.98 }}
            onClick={() => setDrawerOpen(true)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "persona-card-tactile flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] px-1 text-[10px] font-semibold text-[#4B4B4B]",
            )}
          >
            <Users className="size-4 shrink-0" aria-hidden />
            튜터
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ y: 2, scale: 0.98 }}
            disabled={visualBusy}
            onClick={onOpenVisualLab}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "tactile-button flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-gray-100 bg-white px-1 text-[10px] font-semibold text-[#4B4B4B]",
            )}
          >
            <ImageIcon className="size-4 shrink-0 text-emerald-600" aria-hidden />
            Visual
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ y: 2, scale: 0.98 }}
            disabled={mediaBusy}
            onClick={onOpenMediaStudio}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "tactile-button flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-gray-100 bg-white px-1 text-[10px] font-semibold text-[#4B4B4B]",
            )}
          >
            <Clapperboard className="size-4 shrink-0 text-cyan-600" aria-hidden />
            Media
          </motion.button>
        </div>
      </nav>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent
          showCloseButton
          className={cn(
            "workshop-dialog-mobile-spring left-0 top-auto flex max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-3xl rounded-b-none border-2 border-gray-100 p-0 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2",
            "data-[closed]:animate-out",
          )}
        >
          <SpringDialogSurface className="min-h-0 flex-1 flex-col gap-0">
            <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4 text-left">
              <DialogTitle className="text-base font-bold text-[#4B4B4B]">
                튜터 선택
              </DialogTitle>
              <p className="text-xs text-[#4B4B4B]/65">
                선택 즉시 데스크톱 사이드바와 동일한 컨텍스트로 동기화됩니다.
              </p>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] custom-scroll">
              {EDUCATIONAL_PERSONAS.map((p) => {
                const on = selectedPersona?.id === p.id;
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    layout
                    whileTap={{ y: 2, scale: 0.99 }}
                    onClick={() => {
                      selectPersona(p.id);
                      if (p.id === "metaphor_mage") {
                        window.dispatchEvent(new CustomEvent("golden-persona-pancake"));
                      }
                      setDrawerOpen(false);
                    }}
                    data-golden-target={p.id === "metaphor_mage" ? "pancake-wizard" : undefined}
                    className={cn(
                      "persona-card-tactile flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 px-3 py-3 text-left transition-shadow",
                      on
                        ? "border-[color:var(--pw-persona-accent,#10b981)] border-b-[color:var(--pw-persona-accent,#0f766e)] bg-emerald-50/35 shadow-sm"
                        : "border-gray-200 border-b-gray-300 bg-white hover:border-gray-300",
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {p.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-sm font-semibold text-[#4B4B4B]">
                        {p.name}
                      </span>
                      <span className="mt-0.5 block font-sans text-[11px] text-[#4B4B4B]/60">
                        {p.shortDescription}
                      </span>
                    </span>
                    {on ? (
                      <span
                        className="kit-breathe size-2 shrink-0 rounded-full bg-[color:var(--pw-persona-accent,#10b981)]"
                        aria-hidden
                      />
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </SpringDialogSurface>
        </DialogContent>
      </Dialog>
    </>
  );
}
