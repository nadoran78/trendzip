"use client";

import { House, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

type KeywordErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function KeywordError({
  error,
  reset,
}: KeywordErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-[#070708] text-white">
      <section className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center gap-7 border-x border-white/[0.04] bg-[#0a0a0a] px-6 text-center">
        <Link
          href="/"
          aria-label="trendzip 홈"
          className="tz-round text-xl font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00e5ff]"
        >
          tz<span className="text-[#00e5ff]">♡</span>
        </Link>

        <div className="flex size-16 items-center justify-center rounded-full border border-[#ff2d9b]/20 bg-[#ff2d9b]/10 text-[#ff7fc1]">
          <TriangleAlert aria-hidden="true" size={30} strokeWidth={1.7} />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold">
            키워드 정보를 불러오지 못했습니다
          </h1>
          <p className="text-sm leading-6 text-[#888]">
            잠시 후 다시 시도하거나 홈에서 다른 트렌드를 확인해 주세요.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] px-4 text-sm font-bold text-white transition-colors hover:bg-[#222] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            <House aria-hidden="true" size={18} />
            홈
          </Link>
          <button
            type="button"
            onClick={reset}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#00e5ff] px-4 text-sm font-extrabold text-[#0a0a0a] transition-colors hover:bg-[#64efff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            <RotateCcw aria-hidden="true" size={18} />
            다시 시도
          </button>
        </div>
      </section>
    </main>
  );
}
