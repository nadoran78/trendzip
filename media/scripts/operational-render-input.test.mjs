import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createOperationalRenderProps,
  loadOperationalRenderInput,
  validateOperationalRenderManifest,
} from "./operational-render-input.mjs";

function manifest() {
  return {
    schemaVersion: 4,
    status: "DRAFT",
    generatedAt: "2026-08-27T17:01:38",
    contentHash: "a".repeat(64),
    reservation: {
      shortformContentId: 1,
      status: "DRAFT",
      selectedAt: "2026-08-27T17:01:54.522775",
    },
    source: {
      keywordId: 469,
      keyword: "재혼 황후",
      generation: "TEEN",
      category: "드라마",
      rank: 3,
      rankTrend: "NEW",
    },
    editorial: {
      hook: "신민아와 주지훈의 만남, 재혼 황후 티저 공개",
      summary: "디즈니+ 드라마 재혼 황후의 첫 티저가 공개됐습니다.",
      reasons: ["첫 번째 이유입니다.", "두 번째 이유입니다."],
      narration: {
        hook: "후크 내레이션입니다.",
        overview: "개요 내레이션입니다.",
        reasons: "이유 내레이션입니다.",
        evidence: "근거 내레이션입니다.",
        cta: "프로필 링크에서 확인해 보세요.",
      },
    },
    evidence: [
      {
        publisher: "Disney Plus Korea 디즈니 플러스 코리아",
        title: "아주 긴 근거 영상 제목입니다. ".repeat(8),
        url: "https://www.youtube.com/watch?v=official",
      },
    ],
    ctaUrl:
      "https://trendzip.nadoran.com/keyword/469?utm_source=youtube&utm_medium=shorts&utm_campaign=trend_keyword",
  };
}

test("operational manifest maps draft copy and evidence to Remotion props", () => {
  const props = createOperationalRenderProps(manifest());

  assert.equal(props.isSample, false);
  assert.equal(props.sampleLabel, "운영 검수본");
  assert.equal(props.keyword, "재혼 황후");
  assert.equal(props.generation, "TEEN");
  assert.equal(props.generationLabel, "10대");
  assert.deepEqual(props.reasons, ["첫 번째 이유입니다.", "두 번째 이유입니다."]);
  assert.equal(props.narration.hook, "후크 내레이션입니다.");
  assert.equal(Array.from(props.evidence[0].publisher).length <= 30, true);
  assert.equal(Array.from(props.evidence[0].title).length, 70);
  assert.equal(props.recordedAt, "2026-08-27");
});

test("operational manifest rejects a non-draft reservation", () => {
  const input = manifest();
  input.reservation.status = "REVIEW_REQUIRED";

  assert.throws(
    () => validateOperationalRenderManifest(input),
    /reservation.status must be DRAFT/,
  );
});

test("operational manifest rejects incomplete narration before TTS", () => {
  const input = manifest();
  delete input.editorial.narration.cta;

  assert.throws(
    () => validateOperationalRenderManifest(input),
    /narration must contain exactly/,
  );
});

test("operational manifest loader requires the content hash filename", () => {
  const directory = mkdtempSync(join(tmpdir(), "trendzip-operational-render-"));
  const manifestPath = join(directory, "wrong-name.json");
  try {
    writeFileSync(manifestPath, JSON.stringify(manifest()), "utf8");

    assert.throws(
      () => loadOperationalRenderInput(manifestPath),
      /operational manifest filename must be/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
