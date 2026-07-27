import Link from "next/link";

import { GenerationTab } from "@/components/common/GenerationTab";
import type { GenerationSlug } from "@/types/api";

type FeedHeaderProps = {
  generation: GenerationSlug;
  tickerKeywords: string[];
};

export function FeedHeader({
  generation,
  tickerKeywords,
}: FeedHeaderProps) {
  const keywords =
    tickerKeywords.length > 0 ? tickerKeywords : ["오늘의 트렌드"];
  const tickerItems = [...keywords, ...keywords, ...keywords];

  return (
    <header className="sticky top-0 z-40 border-b border-[#222] bg-[#0a0a0a]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
        <Link
          href="/"
          aria-label="trendzip 홈"
          className="tz-round justify-self-start text-lg font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00e5ff]"
        >
          tz<span className="text-[#00e5ff]">♡</span>
        </Link>

        <GenerationTab activeGeneration={generation} />

        <div className="justify-self-end">
          <span className="tz-round inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white">
            <span className="relative size-1.5" aria-hidden="true">
              <span className="tz-live-pulse absolute inset-0 rounded-full bg-[#ff3b3b]" />
              <span className="absolute inset-0 rounded-full bg-[#ff3b3b] shadow-[0_0_8px_#ff3b3b]" />
            </span>
            LIVE
          </span>
        </div>
      </div>

      <div className="tz-ticker-mask flex h-[34px] items-center overflow-hidden border-t border-[#1a1a1a]">
        <div className="tz-ticker-track flex w-max items-center gap-[22px] whitespace-nowrap pl-4 text-[11px] font-medium text-white/55">
          {tickerItems.map((keyword, index) => (
            <span
              key={`${keyword}-${index}`}
              aria-hidden={index >= keywords.length}
              className="inline-flex items-center gap-2"
            >
              <span
                className={[
                  "size-[5px] rounded-full",
                  index % 2 === 0
                    ? "bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]"
                    : "bg-[#ff2d9b] shadow-[0_0_8px_#ff2d9b]",
                ].join(" ")}
              />
              #{keyword}
            </span>
          ))}
        </div>
      </div>

      <nav
        aria-label="피드 화면"
        className="flex h-[42px] items-center justify-center gap-2 border-t border-[#151515]"
      >
        <Link
          href={`/feed/${generation}`}
          aria-current="page"
          className="rounded-full border border-[#00e5ff] bg-[#00e5ff]/10 px-[18px] py-1.5 text-[12px] font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
        >
          피드
        </Link>
        <button
          type="button"
          disabled
          title="랭킹 화면 준비 중"
          className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-[18px] py-1.5 text-[12px] font-extrabold text-[#888]"
        >
          랭킹
        </button>
      </nav>
    </header>
  );
}
