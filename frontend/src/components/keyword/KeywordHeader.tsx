import Link from "next/link";

import { LiveStatus } from "@/components/common/LiveStatus";
import { TrendTicker } from "@/components/common/TrendTicker";
import { KeywordBackButton } from "@/components/keyword/KeywordBackButton";
import type { GenerationSlug } from "@/types/api";

type KeywordHeaderProps = {
  generation: GenerationSlug;
  tickerKeywords: string[];
};

const NAV_ITEMS = [
  { segment: "feed", label: "피드" },
  { segment: "trend", label: "랭킹" },
] as const;

export function KeywordHeader({
  generation,
  tickerKeywords,
}: KeywordHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#222] bg-[#0a0a0a]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4">
        <Link
          href="/"
          aria-label="trendzip 홈"
          className="tz-round text-lg font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00e5ff]"
        >
          tz<span className="text-[#00e5ff]">♡</span>
        </Link>

        <div className="min-w-0 pl-2">
          <KeywordBackButton fallbackHref={`/feed/${generation}`} />
        </div>

        <LiveStatus />
      </div>

      <TrendTicker keywords={tickerKeywords} />

      <nav
        aria-label="트렌드 화면"
        className="flex h-[42px] items-center justify-center gap-2 border-t border-[#151515]"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.segment}
            href={`/${item.segment}/${generation}`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-[18px] py-1.5 text-[12px] font-extrabold text-[#888] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
