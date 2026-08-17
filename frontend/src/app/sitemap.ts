import type { MetadataRoute } from "next";

import { GENERATION_OPTIONS } from "@/lib/generation";
import { toAbsoluteUrl } from "@/lib/seo";
import { getKeywords } from "@/services/trend-api";

export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/privacy"),
      changeFrequency: "monthly",
      priority: 0.2,
    },
    ...GENERATION_OPTIONS.flatMap((generation) => [
      {
        url: toAbsoluteUrl(`/feed/${generation.slug}`),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: toAbsoluteUrl(`/trend/${generation.slug}`),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
    ]),
  ];
  const keywordResults = await Promise.allSettled(
    GENERATION_OPTIONS.map((generation) =>
      getKeywords(generation.apiValue, {
        next: {
          revalidate,
        },
      }),
    ),
  );
  const keywordIds = new Set(
    keywordResults.flatMap((result) =>
      result.status === "fulfilled"
        ? result.value.keywords.map((keyword) => keyword.id)
        : [],
    ),
  );
  const keywordRoutes: MetadataRoute.Sitemap = Array.from(keywordIds)
    .sort((left, right) => left - right)
    .map((keywordId) => ({
      url: toAbsoluteUrl(`/keyword/${keywordId}`),
      changeFrequency: "daily",
      priority: 0.7,
    }));

  return [...staticRoutes, ...keywordRoutes];
}
