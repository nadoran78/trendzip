"use client";

import { X } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  type AnalyticsConsentChoice,
  applyAnalyticsConsent,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "@/lib/analytics/consent";

type AnalyticsConsentContextValue = {
  choice: AnalyticsConsentChoice | null;
  isReady: boolean;
  openSettings: () => void;
};

const AnalyticsConsentContext =
  createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const storedChoice = useSyncExternalStore(
    subscribeAnalyticsConsent,
    readAnalyticsConsent,
    () => undefined,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isReady = storedChoice !== undefined;
  const choice = storedChoice ?? null;

  const contextValue = useMemo(
    () => ({
      choice,
      isReady,
      openSettings: () => setIsSettingsOpen(true),
    }),
    [choice, isReady],
  );
  const shouldShowBanner =
    isReady && (choice === null || isSettingsOpen);

  useEffect(() => {
    if (shouldShowBanner) {
      document.body.dataset.analyticsConsentOpen = "true";
    } else {
      delete document.body.dataset.analyticsConsentOpen;
    }

    return () => {
      delete document.body.dataset.analyticsConsentOpen;
    };
  }, [shouldShowBanner]);

  function updateChoice(nextChoice: AnalyticsConsentChoice) {
    applyAnalyticsConsent(nextChoice);
    setIsSettingsOpen(false);
  }

  return (
    <AnalyticsConsentContext.Provider value={contextValue}>
      {children}
      {shouldShowBanner ? (
        <AnalyticsConsentBanner
          canClose={choice !== null}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={updateChoice}
        />
      ) : null}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
  const context = useContext(AnalyticsConsentContext);

  if (!context) {
    throw new Error(
      "useAnalyticsConsent must be used within AnalyticsConsentProvider.",
    );
  }

  return context;
}

type AnalyticsConsentBannerProps = {
  canClose: boolean;
  onClose: () => void;
  onUpdate: (choice: AnalyticsConsentChoice) => void;
};

function AnalyticsConsentBanner({
  canClose,
  onClose,
  onUpdate,
}: AnalyticsConsentBannerProps) {
  return (
    <section
      role="dialog"
      aria-labelledby="analytics-consent-title"
      aria-describedby="analytics-consent-description"
      className="fixed inset-x-3 bottom-[max(4px,env(safe-area-inset-bottom))] z-[70] mx-auto max-w-[406px] rounded-lg border border-[#303030] bg-[#151515] p-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.72)]"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2
            id="analytics-consent-title"
            className="text-[14px] font-extrabold text-white"
          >
            서비스 이용 분석 설정
          </h2>
          <p
            id="analytics-consent-description"
            className="mt-1 text-[11px] font-medium leading-[1.45] text-[#aaa]"
          >
            분석 쿠키로 콘텐츠 이용 흐름을 파악합니다. 거부해도 모든 기능을
            사용할 수 있습니다.
          </p>
          <Link
            href="/privacy"
            className="mt-0.5 inline-flex text-[10px] font-bold text-[#00e5ff] underline decoration-[#00e5ff]/40 underline-offset-4 hover:text-[#9af5ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            수집 항목과 처리 방식 확인
          </Link>
        </div>

        {canClose ? (
          <button
            type="button"
            aria-label="분석 설정 닫기"
            title="닫기"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#888] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            <X aria-hidden="true" size={17} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onUpdate("denied")}
          className="h-9 rounded-md border border-[#3a3a3a] bg-[#202020] text-[11px] font-extrabold text-white transition-colors hover:border-[#666] hover:bg-[#282828] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
        >
          분석 거부
        </button>
        <button
          type="button"
          onClick={() => onUpdate("granted")}
          className="h-9 rounded-md bg-[#00e5ff] text-[11px] font-extrabold text-[#071012] transition-colors hover:bg-[#9af5ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
        >
          분석 허용
        </button>
      </div>
    </section>
  );
}
