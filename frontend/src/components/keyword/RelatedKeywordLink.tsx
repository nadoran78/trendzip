"use client";

import Link from "next/link";

import { trackAnalyticsEvent } from "@/lib/analytics/events";
import type { Generation, KeywordSummary } from "@/types/api";

type RelatedKeywordLinkProps = {
  generation: Generation;
  sourceKeywordId: number;
  keyword: KeywordSummary;
};

export function RelatedKeywordLink({
  generation,
  sourceKeywordId,
  keyword,
}: RelatedKeywordLinkProps) {
  return (
    <Link
      href={`/keyword/${keyword.id}`}
      onClick={() =>
        trackAnalyticsEvent("related_keyword_click", {
          generation,
          keyword_id: sourceKeywordId,
          related_keyword_id: keyword.id,
          related_keyword: keyword.word,
        })
      }
      className="shrink-0 rounded-full border border-[#00e5ff] bg-[#00e5ff]/[0.06] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#00e5ff]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00e5ff]"
    >
      #{keyword.word}
    </Link>
  );
}
