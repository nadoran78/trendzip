import { fetchApi, type FetchApiOptions } from "@/lib/api-client";
import type {
  FeedResponse,
  Generation,
  KeywordExplainResponse,
  KeywordListResponse,
} from "@/types/api";

export function getFeed(
  generation: Generation,
  options?: FetchApiOptions,
): Promise<FeedResponse> {
  return fetchApi<FeedResponse>("/api/feed", {
    ...options,
    query: {
      ...options?.query,
      generation,
    },
  });
}

export function getKeywords(
  generation: Generation,
  options?: FetchApiOptions,
): Promise<KeywordListResponse> {
  return fetchApi<KeywordListResponse>("/api/keywords", {
    ...options,
    query: {
      ...options?.query,
      generation,
    },
  });
}

export function getKeywordExplain(
  id: number,
  options?: FetchApiOptions,
): Promise<KeywordExplainResponse> {
  return fetchApi<KeywordExplainResponse>(`/api/keywords/${id}/explain`, options);
}
