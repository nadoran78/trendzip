import { Activity } from "lucide-react";

import { TrendIndicator } from "@/components/trend/TrendIndicator";
import type { KeywordSummary } from "@/types/api";

type TrendRowProps = {
  keyword: KeywordSummary;
  isLast: boolean;
};

export function TrendRow({ keyword, isLast }: TrendRowProps) {
  const rankLabel =
    keyword.rank === null ? "--" : String(keyword.rank).padStart(2, "0");
  const hasTopRank = keyword.rank !== null && keyword.rank <= 3;

  return (
    <li
      className={[
        "grid min-h-[82px] grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3 px-1 py-3.5",
        isLast ? "" : "border-b border-[#222]",
      ].join(" ")}
    >
      <span
        aria-label={
          keyword.rank === null ? "순위 집계 중" : `${keyword.rank}위`
        }
        className={[
          "tz-round text-center text-[30px] font-bold leading-none text-[#00e5ff]",
          "[font-variant-numeric:tabular-nums]",
          hasTopRank ? "[text-shadow:0_0_16px_rgba(0,229,255,0.4)]" : "",
        ].join(" ")}
      >
        {rankLabel}
      </span>

      <div className="min-w-0">
        <p
          title={keyword.word}
          className="truncate text-[15px] font-bold text-white"
        >
          #{keyword.word}
        </p>

        <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[11px] font-medium text-[#888]">
          {keyword.category ? (
            <span className="max-w-[96px] truncate rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-semibold text-[#aaa]">
              {keyword.category}
            </span>
          ) : null}

          <span className="inline-flex min-w-0 items-center gap-1">
            <Activity
              aria-hidden="true"
              className="shrink-0"
              size={12}
              strokeWidth={1.8}
            />
            <span className="truncate">
              {keyword.trendScore === null
                ? "점수 집계 중"
                : `점수 ${formatTrendScore(keyword.trendScore)}`}
            </span>
          </span>
        </div>
      </div>

      <span className="pr-1">
        <TrendIndicator
          rankTrend={keyword.rankTrend}
          rankDelta={keyword.rankDelta}
        />
      </span>
    </li>
  );
}

function formatTrendScore(score: number): string {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(score);
}
