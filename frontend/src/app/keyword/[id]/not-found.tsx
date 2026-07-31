import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function KeywordNotFound() {
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

        <div className="flex size-16 items-center justify-center rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/10 text-[#78f1ff]">
          <SearchX aria-hidden="true" size={30} strokeWidth={1.7} />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold">키워드를 찾을 수 없습니다</h1>
          <p className="text-sm leading-6 text-[#888]">
            삭제되었거나 아직 수집되지 않은 키워드입니다.
          </p>
        </div>

        <Link
          href="/"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00e5ff] px-4 text-sm font-extrabold text-[#0a0a0a] transition-colors hover:bg-[#64efff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
        >
          <ArrowLeft aria-hidden="true" size={18} />
          세대 다시 선택
        </Link>
      </section>
    </main>
  );
}
