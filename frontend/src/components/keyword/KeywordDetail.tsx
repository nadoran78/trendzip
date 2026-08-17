import {
  ChartNoAxesCombined,
  Flame,
  Tags,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

import { TrackAnalyticsEvent } from "@/components/analytics/TrackAnalyticsEvent";
import { SiteFooter } from "@/components/common/SiteFooter";
import { RelatedKeywordLink } from "@/components/keyword/RelatedKeywordLink";
import { RelatedVideoCarousel } from "@/components/keyword/RelatedVideoCarousel";
import { TrendGraph } from "@/components/keyword/TrendGraph";
import { getGenerationByApiValue } from "@/lib/generation";
import type { KeywordExplainResponse } from "@/types/api";

type KeywordDetailProps = {
  detail: KeywordExplainResponse;
};

export function KeywordDetail({ detail }: KeywordDetailProps) {
  const generation = getGenerationByApiValue(detail.generation);

  return (
    <>
      <TrackAnalyticsEvent
        event="view_keyword_detail"
        parameters={{
          generation: detail.generation,
          keyword_id: detail.keywordId,
          keyword: detail.keyword,
          rank: detail.rank ?? undefined,
          keyword_category: detail.category ?? undefined,
        }}
      />
      <div className="px-4 pt-5">
        <section className="overflow-hidden rounded-2xl border border-[#222] bg-[#1a1a1a] px-[18px] pb-[22px] pt-5">
          <p className="text-[11px] font-bold tracking-[0.08em] text-[#00e5ff]">
            TRENDING KEYWORD
          </p>
          <h1 className="mt-2.5 break-words text-[28px] font-extrabold leading-[1.18] text-white">
            #{detail.keyword}
          </h1>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {detail.category ? (
              <span className="rounded-full border border-[#2a2a2a] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[#aaa]">
                {detail.category}
              </span>
            ) : null}

            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-extrabold text-[#0a0a0a]",
                detail.generation === "TEEN"
                  ? "bg-gradient-to-br from-[#ff8ad4] to-[#b6ffce] shadow-[0_4px_14px_-4px_rgba(255,138,212,0.5)]"
                  : "bg-gradient-to-br from-[#ffb86b] to-[#ffe16b] shadow-[0_4px_14px_-4px_rgba(255,184,107,0.5)]",
              ].join(" ")}
            >
              <span aria-hidden="true">
                {detail.generation === "TEEN" ? "🎀" : "🍑"}
              </span>
              {generation.label}{" "}
              {detail.rank === null ? "순위 집계 중" : `${detail.rank}위`}
            </span>
          </div>
        </section>
      </div>

      <DetailSection
        title="왜 뜨고 있나?"
        icon={<Flame aria-hidden="true" size={17} />}
      >
        {detail.explain ? (
          <div className="rounded-2xl border border-[#222] bg-[#1a1a1a] px-[18px] py-4">
            <p className="whitespace-pre-line text-[13px] font-medium leading-[1.75] text-white">
              {detail.explain}
            </p>
          </div>
        ) : (
          <EmptySection message="아직 준비된 키워드 설명이 없습니다." />
        )}
      </DetailSection>

      <DetailSection
        title="트렌드 그래프"
        icon={<ChartNoAxesCombined aria-hidden="true" size={17} />}
      >
        <TrendGraph
          keywordId={detail.keywordId}
          keyword={detail.keyword}
          data={detail.trendGraph}
        />
      </DetailSection>

      <DetailSection
        title="관련 영상"
        icon={<Video aria-hidden="true" size={17} />}
        fullBleed
      >
        {detail.relatedVideos.length > 0 ? (
          <RelatedVideoCarousel
            videos={detail.relatedVideos}
            generation={detail.generation}
          />
        ) : (
          <div className="px-4">
            <EmptySection message="아직 연결된 관련 영상이 없습니다." />
          </div>
        )}
      </DetailSection>

      <DetailSection
        title="관련 키워드"
        icon={<Tags aria-hidden="true" size={17} />}
        fullBleed
      >
        {detail.relatedKeywords.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {detail.relatedKeywords.map((keyword) => (
              <RelatedKeywordLink
                key={keyword.id}
                generation={detail.generation}
                sourceKeywordId={detail.keywordId}
                keyword={keyword}
              />
            ))}
          </div>
        ) : (
          <div className="px-4">
            <EmptySection message="아직 연결된 관련 키워드가 없습니다." />
          </div>
        )}
      </DetailSection>

      <SiteFooter subtitle="매일 업데이트 · 한국 유튜브 트렌드" />
    </>
  );
}

type DetailSectionProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  fullBleed?: boolean;
};

function DetailSection({
  title,
  icon,
  children,
  fullBleed = false,
}: DetailSectionProps) {
  return (
    <section className="pt-6">
      <h2 className="flex items-center gap-1.5 px-4 text-[15px] font-extrabold text-[#00e5ff]">
        {title}
        {icon}
      </h2>
      <div className={fullBleed ? "mt-3" : "mt-3 px-4"}>{children}</div>
    </section>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-[#2a2a2a] bg-[#1a1a1a] px-6 text-center text-[13px] font-medium text-[#888]">
      {message}
    </div>
  );
}
