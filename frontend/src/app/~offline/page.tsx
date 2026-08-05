import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

import { OfflineRetryButton } from "./OfflineRetryButton";

export const metadata: Metadata = {
  title: "오프라인",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-[#070708] text-white">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col border-x border-white/[0.04] bg-[#0a0a0a]">
        <header className="border-b border-[#222] px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <span className="tz-round text-lg font-bold text-white">
            tz<span className="text-[#00e5ff]">♡</span>
          </span>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center px-7 py-12 text-center">
          <span className="grid size-16 place-items-center rounded-full border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00e5ff]">
            <WifiOff aria-hidden="true" className="size-7" strokeWidth={2} />
          </span>
          <h1 className="tz-round mt-6 text-2xl font-bold">연결이 끊겼어요</h1>
          <p className="mt-3 max-w-[280px] text-sm leading-6 text-white/60">
            인터넷 연결을 확인한 뒤 다시 시도해 주세요.
          </p>
          <OfflineRetryButton />
        </section>
      </div>
    </main>
  );
}
