export type Generation = "TEEN" | "TWENTY";

export type GenerationSlug = "teen" | "twenty";

export type GenerationLabel = "10대" | "20대";

export type FeedSection = "TODAY_PICK" | "RISING" | "RELATED";

export type RankTrend = "UP" | "DOWN" | "NEW" | "SAME";

export type ApiErrorResponse = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiErrorResponse | null;
};

export type FeedResponse = {
  generation: Generation;
  videos: FeedVideo[];
};

export type FeedVideo = {
  videoId: string;
  keywordId: number;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  viewCount: number | null;
  keyword: string;
  feedSection: FeedSection | null;
  badge: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
};

export type KeywordListResponse = {
  generation: Generation;
  keywords: KeywordSummary[];
};

export type KeywordSummary = {
  id: number;
  word: string;
  rank: number | null;
  category: string | null;
  trendScore: number | null;
  rankTrend: RankTrend | null;
  rankDelta: number | null;
};

export type TrendGraphPoint = {
  period: string;
  ratio: number | null;
  rank: number | null;
};

export type KeywordExplainResponse = {
  keywordId: number;
  keyword: string;
  generation: Generation;
  category: string | null;
  rank: number | null;
  trendScore: number | null;
  rankTrend: RankTrend | null;
  rankDelta: number | null;
  explain: string | null;
  sourceCrawlRunId: number | null;
  snapshotAt: string | null;
  explainedAt: string | null;
  relatedVideos: FeedVideo[];
  trendGraph: TrendGraphPoint[];
  relatedKeywords: KeywordSummary[];
};
