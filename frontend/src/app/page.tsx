import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-50">
      <section className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-between px-6 py-8">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>MZ 따라잡기</span>
          <span>Trendzip</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-emerald-300">
              YouTube trend feed
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-[1.05]">
              10대와 20대의 피드를 한눈에
            </h1>
            <p className="text-base leading-7 text-zinc-400">
              세대별 인기 영상과 급상승 키워드를 모아 30~40대도 지금의
              관심사를 빠르게 따라잡을 수 있게 합니다.
            </p>
          </div>

          <div className="grid gap-3">
            <Link
              href="/feed/teen"
              className="flex min-h-14 items-center justify-between rounded-lg border border-emerald-300/30 bg-emerald-300 px-5 text-base font-semibold text-zinc-950 transition hover:bg-emerald-200"
            >
              <span>10대 피드</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/feed/twenty"
              className="flex min-h-14 items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-5 text-base font-semibold text-zinc-50 transition hover:bg-zinc-800"
            >
              <span>20대 피드</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-zinc-400">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-2xl font-semibold text-zinc-50">10s</p>
            <p className="mt-2">Teen feed</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-2xl font-semibold text-zinc-50">20s</p>
            <p className="mt-2">Twenty feed</p>
          </div>
        </div>
      </section>
    </main>
  );
}
