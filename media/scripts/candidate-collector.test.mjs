import assert from "node:assert/strict";
import test from "node:test";

import { collectOperationalCandidates } from "./candidate-collector.mjs";

function detail({
  keywordId,
  keyword,
  generation,
  rank,
  explain = `${keyword} 설명`,
  sourceCrawlRunId = 501,
  snapshotAt = "2026-08-21T03:00:00",
  relatedVideos = [{ videoId: `video-${keywordId}`, title: `${keyword} 영상` }],
}) {
  return {
    keywordId,
    keyword,
    generation,
    rank,
    category: "엔터테인먼트",
    trendScore: 1000,
    rankTrend: "NEW",
    rankDelta: null,
    explain,
    sourceCrawlRunId,
    snapshotAt,
    explainedAt: "2026-08-21T03:05:00",
    relatedVideos,
    trendGraph: [],
    relatedKeywords: [],
  };
}

test("candidate collector loads limited keyword details and keeps only fresh evidenced candidates", async () => {
  const details = new Map([
    [1, detail({ keywordId: 1, keyword: "십대 1위", generation: "TEEN", rank: 1 })],
    [2, detail({ keywordId: 2, keyword: "십대 2위", generation: "TEEN", rank: 2, explain: null })],
    [4, detail({ keywordId: 4, keyword: "이십대 1위", generation: "TWENTY", rank: 1 })],
    [5, detail({ keywordId: 5, keyword: "이십대 2위", generation: "TWENTY", rank: 2, relatedVideos: [] })],
  ]);
  const requestedIds = [];
  const apiClient = {
    async getKeywordList(generation) {
      const startId = generation === "TEEN" ? 1 : 4;
      return {
        generation,
        keywords: [
          { id: startId, rank: 1 },
          { id: startId + 1, rank: 2 },
          { id: startId + 2, rank: 3 },
        ],
      };
    },
    async getKeywordDetail(keywordId) {
      requestedIds.push(keywordId);
      return details.get(keywordId);
    },
  };

  const candidates = await collectOperationalCandidates({
    apiClient,
    limitPerGeneration: 2,
    now: new Date("2026-08-21T03:00:00.000Z"),
    maximumAgeHours: 72,
  });

  assert.deepEqual(requestedIds.sort((left, right) => left - right), [1, 2, 4, 5]);
  assert.deepEqual(candidates.map((candidate) => candidate.keywordId), [1, 4]);
});

test("candidate collector rejects a non-positive generation limit", async () => {
  await assert.rejects(
    () =>
      collectOperationalCandidates({
        apiClient: {},
        limitPerGeneration: 0,
        now: new Date(),
        maximumAgeHours: 72,
      }),
    /must be a positive integer/,
  );
});

test("candidate collector excludes snapshots older than 72 hours", async () => {
  const apiClient = {
    async getKeywordList(generation) {
      return { generation, keywords: generation === "TEEN" ? [{ id: 1 }] : [] };
    },
    async getKeywordDetail() {
      return detail({
        keywordId: 1,
        keyword: "오래된 키워드",
        generation: "TEEN",
        rank: 1,
        snapshotAt: "2026-08-18T11:59:59",
      });
    },
  };

  const candidates = await collectOperationalCandidates({
    apiClient,
    limitPerGeneration: 10,
    now: new Date("2026-08-21T03:00:00.000Z"),
    maximumAgeHours: 72,
  });

  assert.deepEqual(candidates, []);
});
