import { Suspense } from "react";
import Link from "next/link";

import { GenerationSelector } from "@/components/landing/GenerationSelector";
import {
  LandingTicker,
  LandingTickerFallback,
} from "@/components/landing/LandingTicker";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#070708] text-white">
      <div className="tz-landing-shell relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden border-x border-white/[0.04] bg-[#0a0a0a]">
        <header className="relative z-20 border-b border-[#222] bg-[#0a0a0a]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
            <span className="tz-round justify-self-start text-lg font-bold text-white">
              tz<span className="text-[#00e5ff]">♡</span>
            </span>

            <span aria-hidden="true" />

            <span className="tz-round inline-flex items-center gap-1.5 justify-self-end rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-bold tracking-normal text-white">
              <span className="relative size-1.5" aria-hidden="true">
                <span className="tz-live-pulse absolute inset-0 rounded-full bg-[#ff3b3b]" />
                <span className="absolute inset-0 rounded-full bg-[#ff3b3b] shadow-[0_0_8px_#ff3b3b]" />
              </span>
              LIVE
            </span>
          </div>

          <Suspense fallback={<LandingTickerFallback />}>
            <LandingTicker />
          </Suspense>
        </header>

        <section className="tz-landing-content relative z-10 flex min-h-[calc(100dvh-90px-env(safe-area-inset-top))] flex-1 flex-col items-center justify-center px-[22px] py-8">
          <div className="tz-round inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-[11px] font-semibold text-white/85 backdrop-blur-lg">
            <span className="relative size-[7px]" aria-hidden="true">
              <span className="tz-live-pulse absolute inset-0 rounded-full bg-[#ff3b3b]" />
              <span className="absolute inset-0 rounded-full bg-[#ff3b3b] shadow-[0_0_10px_#ff3b3b]" />
            </span>
            <span className="font-bold text-white">LIVE</span>
            <span className="text-white/55">·</span>
            지금 유튜브 트렌드
          </div>

          <h1 className="tz-landing-wordmark tz-round mt-7 text-center font-bold text-white">
            <span className="block">trend</span>
            <span className="flex items-baseline justify-center gap-1 text-[#00e5ff] [text-shadow:0_0_28px_rgba(0,229,255,0.22),0_0_60px_rgba(0,229,255,0.12)]">
              zip
              <span
                aria-hidden="true"
                className="tz-wordmark-heart inline-block text-[#ff2d9b]"
              >
                ♡
              </span>
            </span>
          </h1>

          <p className="mt-6 text-center text-lg leading-7 text-white/85">
            요즘 MZ가 보는 게 궁금하다면
            <span aria-hidden="true" className="ml-1">
              ✨
            </span>
          </p>
          <p className="tz-round mt-2.5 text-center text-[11px] font-semibold text-white/45">
            <span aria-hidden="true">🔥</span> 매일 업데이트되는 한국 유튜브
            펄스
          </p>

          <GenerationSelector />

          <Link
            href="/privacy"
            className="mt-5 text-[10px] font-semibold text-white/35 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            개인정보 및 분석 설정
          </Link>
        </section>
      </div>
    </main>
  );
}
