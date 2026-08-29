import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createAudioManifest } from "../scripts/audio-manifest.mjs";
import { createNarratedRenderProps } from "../scripts/narrated-props.mjs";
import { createOperationalRenderProps } from "../scripts/operational-render-input.mjs";
import { OPERATIONAL_PUBLIC_CANDIDATE_TIMELINE_OPTIONS } from "../scripts/operational-render-profile.mjs";
import {
  createOperationalRenderManifest,
  writeOperationalRenderManifest,
} from "../scripts/operational-render-manifest.mjs";

export const TEST_VIDEO_METADATA = Object.freeze({
  durationMillis: 36_000,
  width: 1_080,
  height: 1_920,
  fps: 30,
  videoCodec: "h264",
  audioCodec: "aac",
  pixelFormat: "yuv420p",
});

function sourceManifest() {
  return {
    schemaVersion: 4,
    status: "DRAFT",
    generatedAt: "2026-08-27T17:01:38",
    contentHash: "a".repeat(64),
    reservation: { shortformContentId: 1, status: "DRAFT", selectedAt: "2026-08-27T17:01:54" },
    source: {
      keywordId: 469,
      keyword: "재혼 황후",
      generation: "TEEN",
      category: "드라마",
      rank: 3,
      rankTrend: "NEW",
    },
    editorial: {
      hook: "재혼 황후 티저 공개",
      summary: "재혼 황후의 첫 티저가 공개됐습니다.",
      reasons: ["첫 번째 이유입니다.", "두 번째 이유입니다."],
      narration: {
        hook: "후크 내레이션",
        overview: "개요 내레이션",
        reasons: "이유 내레이션",
        evidence: "근거 내레이션",
        cta: "프로필 링크에서 확인해 보세요.",
      },
    },
    evidence: [{ publisher: "디즈니 플러스 코리아", title: "재혼 황후 티저", url: "https://youtu.be/a" }],
    ctaUrl:
      "https://trendzip.nadoran.com/keyword/469?utm_source=youtube&utm_medium=shorts&utm_campaign=trend_keyword",
  };
}

export function createTestOperationalRenderRun() {
  const runDir = mkdtempSync(join(tmpdir(), "trendzip-review-gate-"));
  mkdirSync(resolve(runDir, "tts"));
  mkdirSync(resolve(runDir, "stills"));
  const source = sourceManifest();
  const baseProps = createOperationalRenderProps(source);
  const sceneAudio = Object.fromEntries(
    Object.keys(baseProps.narration).map((sceneId) => [
      sceneId,
      { durationMs: 1_000, byteLength: 1_000 },
    ]),
  );
  const audioManifest = createAudioManifest({
    fixture: baseProps,
    client: { model: "test-model", voice: "test-voice" },
    sceneAudio,
  });
  for (const scene of audioManifest.scenes) {
    writeFileSync(resolve(runDir, "tts", scene.file), Buffer.alloc(scene.byteLength));
  }
  writeFileSync(resolve(runDir, "source-manifest.json"), JSON.stringify(source));
  writeFileSync(resolve(runDir, "tts/audio-manifest.json"), JSON.stringify(audioManifest));
  const renderProps = createNarratedRenderProps({
    fixture: baseProps,
    manifest: audioManifest,
    audioDir: resolve(runDir, "tts"),
    audioPublicPath: "tts",
    timelineOptions: OPERATIONAL_PUBLIC_CANDIDATE_TIMELINE_OPTIONS,
  });
  writeFileSync(resolve(runDir, "render-props.json"), JSON.stringify(renderProps));
  writeFileSync(resolve(runDir, "video.mp4"), Buffer.alloc(10_000, 1));
  writeFileSync(resolve(runDir, "stills/01-hook.png"), Buffer.alloc(100, 2));

  const manifest = createOperationalRenderManifest({
    runDir,
    videoMetadata: TEST_VIDEO_METADATA,
    stillFiles: ["stills/01-hook.png"],
    createdAt: "2026-08-27T18:00:00.000Z",
  });
  writeOperationalRenderManifest(resolve(runDir, "render-manifest.json"), manifest);
  return { runDir, manifest };
}
