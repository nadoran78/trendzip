import Link from "next/link";

import {
  GenerationTab,
  type TrendView,
} from "@/components/common/GenerationTab";
import { LiveStatus } from "@/components/common/LiveStatus";
import { TrendTicker } from "@/components/common/TrendTicker";
import type { GenerationSlug } from "@/types/api";

type TrendHeaderProps = {
  generation: GenerationSlug;
  activeView: TrendView;
  tickerKeywords: string[];
};

const VIEW_OPTIONS: readonly {
  id: TrendView;
  label: string;
}[] = [
  {
    id: "feed",
    label: "피드",
  },
  {
    id: "trend",
    label: "랭킹",
  },
];

export function TrendHeader({
  generation,
  activeView,
  tickerKeywords,
}: TrendHeaderProps) {
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

        <GenerationTab
          activeGeneration={generation}
          activeView={activeView}
        />

        <div className="justify-self-end">
          <LiveStatus />
        </div>
      </div>

      <TrendTicker keywords={tickerKeywords} />

      <nav
        aria-label="트렌드 화면"
        className="flex h-[42px] items-center justify-center gap-2 border-t border-[#151515]"
      >
        {VIEW_OPTIONS.map((option) => {
          const isActive = option.id === activeView;

          return (
            <Link
              key={option.id}
              href={`/${option.id}/${generation}`}
              aria-current={isActive ? "page" : undefined}
              className={[
                "rounded-full border px-[18px] py-1.5 text-[12px] font-extrabold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]",
                isActive
                  ? "border-[#00e5ff] bg-[#00e5ff]/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-[#888] hover:text-white",
              ].join(" ")}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
