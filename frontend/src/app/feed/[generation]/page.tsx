import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrendHeader } from "@/components/common/TrendHeader";
import { FeedList } from "@/components/feed/FeedList";
import { getGenerationBySlug } from "@/lib/generation";
import { createPageMetadata } from "@/lib/seo";
import { getFeed } from "@/services/trend-api";

export const dynamic = "force-dynamic";

type FeedPageProps = {
  params: Promise<{
    generation: string;
  }>;
};

export async function generateMetadata({
  params,
}: FeedPageProps): Promise<Metadata> {
  const { generation } = await params;
  const generationOption = getGenerationBySlug(generation);

  if (!generationOption) {
    notFound();
  }

  return createPageMetadata({
    title: `${generationOption.label} 유튜브 트렌드 피드`,
    description: `${generationOption.label}가 지금 보고 있는 인기 유튜브 영상과 관련 키워드를 trendzip에서 확인하세요.`,
    path: `/feed/${generationOption.slug}`,
  });
}

export default async function FeedPage({ params }: FeedPageProps) {
  const { generation } = await params;
  const generationOption = getGenerationBySlug(generation);

  if (!generationOption) {
    notFound();
  }

  const feed = await getFeed(generationOption.apiValue, {
    cache: "no-store",
  });
  const tickerKeywords = Array.from(
    new Set(feed.videos.map((video) => video.keyword).filter(Boolean)),
  ).slice(0, 9);

  return (
    <main className="min-h-dvh bg-[#070708] text-white">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] border-x border-white/[0.04] bg-[#0a0a0a]">
        <TrendHeader
          generation={generationOption.slug}
          activeView="feed"
          tickerKeywords={tickerKeywords}
        />
        <FeedList
          videos={feed.videos}
          generation={generationOption.slug}
        />
      </div>
    </main>
  );
}
