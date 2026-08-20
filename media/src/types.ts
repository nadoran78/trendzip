export type Generation = "TEEN" | "TWENTY";

export type RankTrend = "NEW" | "UP" | "DOWN" | "SAME";

export type NarrationSceneId = "hook" | "overview" | "reasons" | "evidence" | "cta";

export type Narration = Record<NarrationSceneId, string>;

export type NarrationSceneTimeline = {
  id: NarrationSceneId;
  from: number;
  audioFrom: number;
  durationInFrames: number;
};

export type NarrationTimeline = {
  scenes: NarrationSceneTimeline[];
  durationInFrames: number;
  durationSeconds: number;
};

export type NarrationAudio = Record<NarrationSceneId, string>;

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
  narration: Narration;
  evidence: Evidence[];
  ctaUrl: string;
  recordedAt: string;
  durationSeconds: number;
  timeline?: NarrationTimeline;
  narrationAudio?: NarrationAudio;
};
