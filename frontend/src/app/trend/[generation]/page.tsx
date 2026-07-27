import { notFound } from "next/navigation";

import { TrendHeader } from "@/components/common/TrendHeader";
import { TrendRanking } from "@/components/trend/TrendRanking";
import { getGenerationBySlug } from "@/lib/generation";
import { getKeywords } from "@/services/trend-api";

export const dynamic = "force-dynamic";

type TrendPageProps = {
  params: Promise<{
    generation: string;
  }>;
};

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
