"use client";

import { SlidersHorizontal } from "lucide-react";

import { useAnalyticsConsent } from "@/components/analytics/AnalyticsConsentProvider";

export function AnalyticsSettingsButton() {
  const { choice, isReady, openSettings } = useAnalyticsConsent();
  const statusLabel = !isReady
    ? "확인 중"
    : choice === "granted"
      ? "허용됨"
      : choice === "denied"
        ? "거부됨"
        : "선택 전";

  return (
    <button
      type="button"
      onClick={openSettings}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#3a3a3a] bg-[#1a1a1a] px-4 text-[13px] font-extrabold text-white transition-colors hover:border-[#00e5ff]/60 hover:bg-[#222] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
    >
      <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={2} />
      분석 설정 변경
      <span className="text-[11px] font-semibold text-[#888]">
        {statusLabel}
      </span>
    </button>
  );
}
