import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { RankTrend } from "@/types/api";

type TrendIndicatorProps = {
  rankTrend: RankTrend | null;
  rankDelta: number | null;
};

export function TrendIndicator({
  rankTrend,
  rankDelta,
}: TrendIndicatorProps) {
  if (rankTrend === "NEW") {
    return (
      <span className="tz-round inline-flex min-h-6 items-center rounded-md bg-[#ff2d9b] px-2.5 text-[10px] font-extrabold text-white shadow-[0_0_14px_-2px_#ff2d9b]">
        NEW
      </span>
    );
  }

  if (rankTrend === "UP") {
    return (
      <span
        aria-label={
          rankDelta === null ? "순위 상승" : `순위 ${rankDelta}단계 상승`
        }
        className="tz-round inline-flex items-center gap-0.5 text-[13px] font-extrabold text-[#3ddc97]"
      >
        <ArrowUp aria-hidden="true" size={15} strokeWidth={2.5} />
        {rankDelta ?? "--"}
      </span>
    );
  }

  if (rankTrend === "DOWN") {
    return (
      <span
        aria-label={
          rankDelta === null ? "순위 하락" : `순위 ${rankDelta}단계 하락`
        }
        className="tz-round inline-flex items-center gap-0.5 text-[13px] font-extrabold text-[#ff5a5a]"
      >
        <ArrowDown aria-hidden="true" size={15} strokeWidth={2.5} />
        {rankDelta ?? "--"}
      </span>
    );
  }

  if (rankTrend === "SAME") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/35">
        <Minus aria-hidden="true" size={14} strokeWidth={2} />
        유지
      </span>
    );
  }

  return (
    <span
      aria-label="순위 변동 집계 중"
      className="inline-flex items-center text-white/20"
    >
      <Minus aria-hidden="true" size={14} strokeWidth={2} />
    </span>
  );
}
