import { notFound } from "next/navigation";

import { KeywordDetail } from "@/components/keyword/KeywordDetail";
import { KeywordHeader } from "@/components/keyword/KeywordHeader";
import { ApiClientError } from "@/lib/api-client";
import { getGenerationByApiValue } from "@/lib/generation";
import { getKeywordExplain } from "@/services/trend-api";
import type { KeywordExplainResponse } from "@/types/api";

export const dynamic = "force-dynamic";

type KeywordPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function KeywordPage({ params }: KeywordPageProps) {
  const { id: idParam } = await params;
  const keywordId = parseKeywordId(idParam);

  if (keywordId === null) {
    notFound();
  }

  let detail: KeywordExplainResponse;

  try {
    detail = await getKeywordExplain(keywordId, {
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }

    throw error;
  }

  const generation = getGenerationByApiValue(detail.generation);
  const tickerKeywords = Array.from(
    new Set([
      detail.keyword,
      ...detail.relatedKeywords.map((keyword) => keyword.word),
    ]),
  )
    .filter(Boolean)
    .slice(0, 9);

  return (
    <main className="min-h-dvh bg-[#070708] text-white">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] border-x border-white/[0.04] bg-[#0a0a0a]">
        <KeywordHeader
          generation={generation.slug}
          tickerKeywords={tickerKeywords}
        />
        <KeywordDetail detail={detail} />
      </div>
    </main>
  );
}

function parseKeywordId(id: string): number | null {
  if (!/^[1-9]\d*$/.test(id)) return null;

  const keywordId = Number(id);

  return Number.isSafeInteger(keywordId) ? keywordId : null;
}
