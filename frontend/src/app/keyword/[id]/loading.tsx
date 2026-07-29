export default function KeywordLoading() {
  return (
    <main
      aria-busy="true"
      className="min-h-dvh bg-[#070708] text-white"
    >
      <div className="mx-auto min-h-dvh w-full max-w-[430px] border-x border-white/[0.04] bg-[#0a0a0a]">
        <header className="border-b border-[#222] pt-[env(safe-area-inset-top)]">
          <div className="grid h-14 grid-cols-[36px_minmax(0,1fr)_48px] items-center gap-3 px-4">
            <div className="h-5 w-9 animate-pulse rounded bg-white/10" />
            <div className="h-8 w-[72px] animate-pulse rounded-full bg-[#1a1a1a]" />
            <div className="h-7 w-12 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
          <div className="h-[34px] animate-pulse border-t border-[#1a1a1a] bg-white/[0.02]" />
          <div className="flex h-[42px] items-center justify-center gap-2 border-t border-[#151515]">
            <div className="h-7 w-16 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-7 w-16 animate-pulse rounded-full bg-white/[0.04]" />
          </div>
        </header>

        <div className="space-y-6 px-4 pt-5">
          <div className="h-40 animate-pulse rounded-2xl border border-[#222] bg-[#1a1a1a]" />

          {[0, 1].map((index) => (
            <section key={index} className="space-y-3">
              <div className="h-5 w-32 animate-pulse rounded bg-[#00e5ff]/10" />
              <div className="h-36 animate-pulse rounded-2xl border border-[#222] bg-[#1a1a1a]" />
            </section>
          ))}

          <section className="space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-[#00e5ff]/10" />
            <div className="flex gap-3 overflow-hidden">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="h-40 w-[188px] shrink-0 animate-pulse rounded-2xl border border-[#222] bg-[#1a1a1a]"
                />
              ))}
            </div>
          </section>
        </div>
      </div>
      <span className="sr-only">키워드 상세 정보를 불러오는 중입니다.</span>
    </main>
  );
}
