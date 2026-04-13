"use client";

import { useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpringDialogSurface } from "@/components/spring-dialog-surface";
import {
  getDataVolatilitySnapshot,
  subscribeDataVolatility,
} from "@/lib/client/data-volatility-meter";

export type SecurityTrustDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DataVolatilityMeter() {
  const snap = useSyncExternalStore(subscribeDataVolatility, getDataVolatilitySnapshot);
  return (
    <div className="mb-5 rounded-2xl border-2 border-emerald-100/90 bg-gradient-to-br from-emerald-50/90 to-white px-4 py-3 shadow-[0_3px_0_0_rgb(209_250_229)]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/80">
        데이터 휘발성 미터
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div
          className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/90"
          role="progressbar"
          aria-valuenow={snap.pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-500 ease-out"
            style={{ width: `${snap.pct}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-emerald-900">
          {snap.pct}%
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-900">{snap.headline}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{snap.detail}</p>
    </div>
  );
}

/** STITCH `security-modal-overlay` — 다이얼로그 본문에 E2EE 상태 배너를 포함합니다. */
export function SecurityTrustDialog({
  open,
  onOpenChange,
}: SecurityTrustDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="security-modal-overlay"
        className="security-modal-overlay flex max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-gray-100 p-4 shadow-[0_4px_0_0_rgb(229_231_235)] sm:max-w-xl sm:p-6"
      >
        <SpringDialogSurface className="min-h-0 flex-1 flex-col gap-4">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-bold tracking-tight">
              🔒 Pristine Workshop 보안 · 신뢰
            </DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed">
              학습 데이터와 생성 파이프라인은 교육 목적의 통제된 처리 경로를 따릅니다.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 custom-scroll">
            <div
              className="mb-4 rounded-2xl border-2 border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-sm"
              role="status"
            >
              <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-emerald-500 align-middle" />
              E2EE 암호화: 활성 — 음성·세션 메타데이터는 휘발성 메모리에서만 처리되며, 학습
              완료 후 즉시 제거됩니다.
            </div>
            <DataVolatilityMeter />
            <ul className="list-disc space-y-3 pb-1 pl-5 text-sm leading-relaxed text-slate-700">
              <li>
                <strong className="text-slate-900">세션 격리</strong>: 요청 단위로 컨텍스트가
                분리되며, 불필요한 장기 보관을 피합니다.
              </li>
              <li>
                <strong className="text-slate-900">비용·예산 가드</strong>: CFO 추정치와 HITL
                승인으로 예기치 않은 API 과금을 완화합니다.
              </li>
              <li>
                <strong className="text-slate-900">사용자 음성 데이터 보호 정책</strong>:
                Media Studio의 음성 샘플은 서버에서 피치·톤 등 <strong>특징 벡터(텍스트 지침)</strong>
                만 추출한 뒤, 원본 오디오 버퍼는 즉시 파기됩니다. 특징 데이터는 TLS 전송 후
                메모리 내에서만 잠시 사용되며, 장기 저장·재판매·제3자 학습용으로 활용하지
                않습니다. TTS 단계에는 영문 합성 지침만 전달됩니다.
              </li>
              <li>
                <strong className="text-slate-900">투명성</strong>: 보안 관련 동작은 UI의
                안전 배지와 세션 영수증 흐름에서 확인할 수 있습니다.
              </li>
              <li>
                <strong className="text-slate-900">PII Shield</strong>: Visual Lab·Media Studio
                텍스트는 외부 AI로 나가기 전 정규식 1차 마스킹 후, 설정 시 Gemini로 잔여 인명 등을
                치환합니다. 처리 중 헤더의 방패 아이콘이 빠르게 맥동합니다.
              </li>
            </ul>
          </div>
        </SpringDialogSurface>
      </DialogContent>
    </Dialog>
  );
}
