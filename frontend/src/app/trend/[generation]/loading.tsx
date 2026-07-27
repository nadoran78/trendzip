export default function TrendLoading() {
  return (
    <main
      aria-busy="true"
      className="min-h-dvh bg-[#070708] text-white"
    >
      <div className="mx-auto min-h-dvh w-full max-w-[430px] border-x border-white/[0.04] bg-[#0a0a0a]">
        <header className="border-b border-[#222] pt-[env(safe-area-inset-top)]">
          <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
            <div className="h-5 w-9 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-[154px] animate-pulse rounded-full bg-[#1a1a1a]" />
            <div className="h-7 w-12 animate-pulse justify-self-end rounded-full bg-white/[0.06]" />
          </div>
          <div className="h-[34px] animate-pulse border-t border-[#1a1a1a] bg-white/[0.02]" />
          <div className="flex h-[42px] items-center justify-center gap-2 border-t border-[#151515]">
            <div className="h-7 w-16 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-7 w-16 animate-pulse rounded-full bg-[#00e5ff]/10" />
          </div>
        </header>

        <section className="px-[18px] pt-[22px]">
          <div className="mb-3.5 space-y-2 px-1 pt-1">
            <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-44 animate-pulse rounded bg-white/[0.05]" />
          </div>

          <div>
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="grid min-h-[82px] grid-cols-[46px_minmax(0,1fr)_36px] items-center gap-3 border-b border-[#222] px-1 py-3.5"
              >
                <div className="mx-auto size-8 animate-pulse rounded bg-[#00e5ff]/10" />
                <div className="space-y-2">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
                  <div className="h-5 w-3/5 animate-pulse rounded bg-white/[0.05]" />
                </div>
                <div className="h-5 w-8 animate-pulse rounded bg-white/[0.05]" />
              </div>
            ))}
          </div>
        </section>
      </div>
      <span className="sr-only">
        트렌드 키워드 순위를 불러오는 중입니다.
      </span>
    </main>
  );
}
