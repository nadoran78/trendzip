import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KeywordDetail } from "@/components/keyword/KeywordDetail";
import { KeywordHeader } from "@/components/keyword/KeywordHeader";
import { ApiClientError } from "@/lib/api-client";
import { getGenerationByApiValue } from "@/lib/generation";
import {
  createMetadataDescription,
  createPageMetadata,
} from "@/lib/seo";
import { getKeywordDetail } from "@/services/keyword-detail";
import type { KeywordExplainResponse } from "@/types/api";

export const dynamic = "force-dynamic";

type KeywordPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: KeywordPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadKeywordDetail(id);
  const generation = getGenerationByApiValue(detail.generation);
  const fallbackDescription = `${generation.label} 사이에서 ${detail.keyword} 키워드가 주목받는 이유와 관련 영상을 확인하세요.`;

  return createPageMetadata({
    title: `${detail.keyword} - 지금 뜨는 이유`,
    description: createMetadataDescription(
      detail.explain,
      fallbackDescription,
    ),
    path: `/keyword/${detail.keywordId}`,
  });
}

export default async function KeywordPage({ params }: KeywordPageProps) {
  const { id } = await params;
  const detail = await loadKeywordDetail(id);

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

async function loadKeywordDetail(
  idParam: string,
): Promise<KeywordExplainResponse> {
  const keywordId = parseKeywordId(idParam);

  if (keywordId === null) {
    notFound();
  }

  try {
    return await getKeywordDetail(keywordId);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

function parseKeywordId(id: string): number | null {
  if (!/^[1-9]\d*$/.test(id)) return null;

  const keywordId = Number(id);

  return Number.isSafeInteger(keywordId) ? keywordId : null;
}
