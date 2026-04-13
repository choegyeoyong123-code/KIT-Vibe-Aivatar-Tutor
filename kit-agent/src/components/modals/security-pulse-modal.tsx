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

/** 대한민국 개인정보 보호법 — 제35·36·37조 핵심 (UI 안내용, 구체 행사는 법령·처리방침·운영 채널에 따름) */
function LegalRightsPipaSection() {
  return (
    <section
      className="mb-5 rounded-2xl border-2 border-slate-200/90 bg-gradient-to-br from-slate-50/95 to-white px-4 py-4 shadow-[0_3px_0_0_rgb(226_232_240)]"
      aria-labelledby="pipa-legal-rights-heading"
    >
      <p
        id="pipa-legal-rights-heading"
        className="font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500"
      >
        사용자의 법적 권리
      </p>
      <p className="mt-1 text-xs font-semibold leading-snug text-slate-800">
        「개인정보 보호법」 제35조·제36조·제37조 요약
      </p>
      <ul className="mt-3 space-y-3 border-t border-slate-200/80 pt-3 text-sm leading-relaxed text-slate-700">
        <li>
          <strong className="text-slate-900">제35조(개인정보의 열람)</strong>
          <span className="mt-0.5 block text-[13px] font-normal text-slate-600">
            정보주체는 개인정보처리자가 처리하는 <strong className="font-semibold text-slate-800">자신의 개인정보</strong>에
            대한 열람을 요구할 수 있고, 처리자는 지체 없이 열람할 수 있도록 해야 합니다. 다른
            사람의 생명·신체를 해할 우려가 있거나 법령에서 정한 사유에 해당하는 경우 등에는
            열람이 제한되거나 거절될 수 있습니다.
          </span>
        </li>
        <li>
          <strong className="text-slate-900">제36조(개인정보의 정정·삭제)</strong>
          <span className="mt-0.5 block text-[13px] font-normal text-slate-600">
            정보주체는 처리 중인 개인정보가 사실과 다를 경우 <strong className="font-semibold text-slate-800">정정</strong>을,
            법령이 정한 삭제 사유에 해당할 때 <strong className="font-semibold text-slate-800">삭제</strong>를 각각 요구할 수
            있습니다. 처리자는 위법한 처리가 확인되면 지체 없이 삭제 등 조치를 하고, 다른 법령에
            따라 보존해야 하는 경우 등에는 삭제가 제한될 수 있습니다.
          </span>
        </li>
        <li>
          <strong className="text-slate-900">제37조(개인정보의 처리정지 등)</strong>
          <span className="mt-0.5 block text-[13px] font-normal text-slate-600">
            정보주체는 법이 정한 사유(예: 법령 위반에 의한 처리, 동의 철회 후에도 불필요한 계속
            처리 등)에 해당할 때 개인정보 처리의 <strong className="font-semibold text-slate-800">정지</strong>를 요구할 수
            있습니다. 다만 같은 법 제37조제2항 각 호에 해당하면 처리정지 요구가 거절될 수
            있습니다. 자동화된 결정 거부·설명 요구 등은 같은 법 제37조제3항 등 별도 규정에
            따릅니다.
          </span>
        </li>
      </ul>
      <p className="mt-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        위 내용은 2026년 4월 기준 법령 구조에 따른 <strong className="text-slate-700">요약 안내</strong>
        입니다. 조문 문언·예외·절차는 「개인정보 보호법」 전문 및 서비스 개인정보 처리방침을
        확인하시고, 분쟁·불만은 개인정보위원회 등 관계 기관 안내에 따르시기 바랍니다.
      </p>
    </section>
  );
}

/** 본 UI에서 음성·학습 데이터를 스스로 제어·권리를 행사하는 방법 요약 */
function ServiceUserRightsGuideSection() {
  return (
    <section
      className="mb-5 rounded-2xl border-2 border-indigo-100/90 bg-gradient-to-br from-indigo-50/90 to-white px-4 py-4 shadow-[0_3px_0_0_rgb(224_231_255)]"
      aria-labelledby="service-user-rights-heading"
    >
      <p
        id="service-user-rights-heading"
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700/80"
      >
        본 서비스에서의 데이터 제어 · 권리 행사 가이드
      </p>
      <p className="mt-1 text-xs font-semibold leading-snug text-indigo-950">
        음성·학습 관련 정보를 스스로 다루는 방법(요약)
      </p>
      <ul className="mt-3 space-y-2.5 border-t border-indigo-200/70 pt-3 text-[13px] leading-relaxed text-slate-700">
        <li>
          <strong className="text-slate-900">학습 텍스트(이름·목표·자료 설명 등)</strong>: 대시보드
          입력란에서 직접 수정·삭제한 뒤 다시 제출할 수 있습니다. 열람·정정에 해당하는 조치로
          활용하실 수 있습니다.
        </li>
        <li>
          <strong className="text-slate-900">세션·분석 결과</strong>: 새 학습 실행 시 별도의 세션
          컨텍스트로 이어지며, 장기 보관이 필요 없는 데모·심사 환경에서는 브라우저를 닫거나
          페이지를 새로 고침한 뒤 필요한 항목만 다시 입력하는 방식으로 노출 범위를 줄일 수
          있습니다.
        </li>
        <li>
          <strong className="text-slate-900">음성(Media Studio 등)</strong>: UI에서 제공하는
          암호화·잠금(E2EE) 옵션을 사용할 수 있고, 원본 오디오는 특징 추출 후 즉시 파기되는
          경로를 따릅니다(아래 기술 보호 항목 참고). 동의 철회·처리 정지 요구는 운영 정책상
          허용되는 범위에서 접수 채널을 통해 진행됩니다.
        </li>
        <li>
          <strong className="text-slate-900">브라우저 로컬 설정</strong>: 튜터링 톤 등 일부
          선호는 이 기기의 <code className="rounded bg-slate-100 px-1 text-[11px]">localStorage</code>에만
          저장됩니다. 삭제·초기화는 브라우저의 사이트 데이터 삭제 또는 개발자 도구를 통해
          수행할 수 있습니다.
        </li>
        <li>
          <strong className="text-slate-900">법 제35·36·37조에 따른 공식 요청</strong>: 열람,
          정정·삭제, 처리정지 등은 서비스의 <strong className="text-slate-900">개인정보 처리방침에 기재된
          연락처</strong>(또는 운영자 지정 채널)로 신청해 주십시오. 신원 확인 후 법령에 따른
          기한·절차로 답변드립니다.
        </li>
      </ul>
    </section>
  );
}

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
            <LegalRightsPipaSection />
            <ServiceUserRightsGuideSection />
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
