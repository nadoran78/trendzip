export type Generation = "TEEN" | "TWENTY";

export type RankTrend = "NEW" | "UP" | "DOWN" | "SAME";

export type Evidence = {
  publisher: string;
  title: string;
  url: string;
};

export type KeywordShortformProps = {
  isSample: boolean;
  sampleLabel: string;
  keyword: string;
  generation: Generation;
  generationLabel: string;
  rank: number;
  rankTrend: RankTrend;
  category: string;
  hook: string;
  summary: string;
  reasons: [string, string];
  evidence: Evidence[];
  ctaUrl: string;
  recordedAt: string;
  durationSeconds: number;
};
