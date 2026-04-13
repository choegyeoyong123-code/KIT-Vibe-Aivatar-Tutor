"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TutoringTonePreference = "balanced" | "encouraging" | "concise";

const TONE_OPTIONS: {
  id: TutoringTonePreference;
  label: string;
  hint: string;
}[] = [
  { id: "balanced", label: "균형", hint: "설명과 속도를 균형 있게 맞춥니다." },
  { id: "encouraging", label: "격려형", hint: "동기 부여와 긍정 피드백을 강조합니다." },
  { id: "concise", label: "간결형", hint: "핵심만 빠르게 정리합니다." },
];

export type UserSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  email: string;
  learningGoal: string;
  tutoringTone: TutoringTonePreference;
  onTutoringToneChange?: (tone: TutoringTonePreference) => void;
};

/**
 * Zen 헤더 프로필(나)에서 열리는 개인 요약 + 튜터링 선호 설정.
 * 데스크톱은 우측 슬라이드오버 느낌, 소형 화면은 하단에 가깝게 뜨는 시트 형태에 가깝게 배치합니다.
 */
export function UserSettings({
  open,
  onOpenChange,
  displayName,
  email,
  learningGoal,
  tutoringTone,
  onTutoringToneChange,
}: UserSettingsProps) {
  const [panel, setPanel] = useState<"profile" | "prefs">("profile");
  const [draftTone, setDraftTone] = useState<TutoringTonePreference>(tutoringTone);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!open) {
      setPanel("profile");
      setSavedFlash(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && panel === "prefs") setDraftTone(tutoringTone);
  }, [open, panel, tutoringTone]);

  const handleOpenPrefs = () => {
    setDraftTone(tutoringTone);
    setPanel("prefs");
  };

  const handleSavePrefs = () => {
    onTutoringToneChange?.(draftTone);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
    setPanel("profile");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[min(90dvh,36rem)] w-[min(calc(100vw-2rem),24rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-0 text-[#4B4B4B] shadow-[0_4px_0_0_rgb(229_231_235)]",
          "top-auto bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 translate-y-0",
          "data-open:slide-in-from-bottom-4 data-closed:slide-out-to-bottom-4",
          "sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:rounded-l-3xl sm:border-y sm:border-l-2 sm:border-r-0",
          "sm:data-open:slide-in-from-right-8 sm:data-closed:slide-out-to-right-8",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-[#4B4B4B]">
            {panel === "profile" ? "내 프로필" : "개인 설정"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#4B4B4B]/65">
            {panel === "profile"
              ? "학습 진행 맥락에서 확인되는 계정 요약입니다."
              : "튜터링 톤을 선택하면 이 브라우저에 저장됩니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 custom-scroll">
          {panel === "profile" ? (
            <div className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#4B4B4B]/45">
                    이름
                  </dt>
                  <dd className="mt-0.5 font-medium">{displayName || "학습자"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#4B4B4B]/45">
                    이메일
                  </dt>
                  <dd className="mt-0.5 break-all text-[#4B4B4B]/85">{email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#4B4B4B]/45">
                    현재 학습 목표
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed text-[#4B4B4B]/85">
                    {learningGoal || "아직 목표가 없습니다."}
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] font-semibold text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)]"
                onClick={handleOpenPrefs}
              >
                개인 설정 변경
              </Button>
              {savedFlash ? (
                <p className="text-center text-xs font-medium text-emerald-600" role="status">
                  튜터링 선호가 저장되었습니다.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#4B4B4B]/70">튜터링 선호(톤)</p>
              <div className="space-y-2" role="radiogroup" aria-label="튜터링 톤">
                {TONE_OPTIONS.map((opt) => {
                  const on = draftTone === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setDraftTone(opt.id)}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "flex h-auto w-full flex-col items-start gap-0.5 rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold shadow-[0_2px_0_0_rgb(229_231_235)] transition-colors",
                        on
                          ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                          : "border-gray-100 bg-white text-[#4B4B4B] hover:bg-[#FAFAFA]",
                      )}
                    >
                      {opt.label}
                      <span className="text-[11px] font-normal text-[#4B4B4B]/65">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl font-semibold text-[#4B4B4B]"
                  onClick={() => setPanel("profile")}
                >
                  <ChevronLeft className="mr-1 size-4" aria-hidden />
                  뒤로
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="ml-auto rounded-2xl border-2 border-emerald-200 bg-emerald-600 font-semibold text-white shadow-[0_2px_0_0_rgb(16_185_129_/_0.35)] hover:bg-emerald-600/90"
                  onClick={handleSavePrefs}
                >
                  저장
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
