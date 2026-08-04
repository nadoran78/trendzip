import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TrendHeader } from "@/components/common/TrendHeader";
import { TrendRanking } from "@/components/trend/TrendRanking";
import { getGenerationBySlug } from "@/lib/generation";
import { createPageMetadata } from "@/lib/seo";
import { getKeywords } from "@/services/trend-api";

export const dynamic = "force-dynamic";

type TrendPageProps = {
  params: Promise<{
    generation: string;
  }>;
};

export async function generateMetadata({
  params,
}: TrendPageProps): Promise<Metadata> {
  const { generation } = await params;
  const generationOption = getGenerationBySlug(generation);

  if (!generationOption) {
    notFound();
  }

  return createPageMetadata({
    title: `${generationOption.label} 인기 키워드 순위`,
    description: `${generationOption.label} 사이에서 지금 주목받는 유튜브 트렌드 키워드와 순위 변화를 확인하세요.`,
    path: `/trend/${generationOption.slug}`,
  });
}

export default async function TrendPage({ params }: TrendPageProps) {
  const { generation } = await params;
  const generationOption = getGenerationBySlug(generation);

  if (!generationOption) {
    notFound();
  }

  const keywordResponse = await getKeywords(generationOption.apiValue, {
    cache: "no-store",
  });
  const tickerKeywords = keywordResponse.keywords
    .map((keyword) => keyword.word)
    .filter(Boolean)
    .slice(0, 9);

  return (
    <main className="min-h-dvh bg-[#070708] text-white">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] border-x border-white/[0.04] bg-[#0a0a0a]">
        <TrendHeader
          generation={generationOption.slug}
          activeView="trend"
          tickerKeywords={tickerKeywords}
        />
        <TrendRanking
          generation={generationOption.slug}
          keywords={keywordResponse.keywords}
        />
      </div>
    </main>
  );
}
