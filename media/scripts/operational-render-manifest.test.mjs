import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createAudioManifest } from "./audio-manifest.mjs";
import { createNarratedRenderProps } from "./narrated-props.mjs";
import { createOperationalRenderProps } from "./operational-render-input.mjs";
import {
  OPERATIONAL_PUBLIC_CANDIDATE_PLAYBACK_RATE,
  OPERATIONAL_PUBLIC_CANDIDATE_TIMELINE_OPTIONS,
} from "./operational-render-profile.mjs";
import {
  createOperationalRenderManifest,
  OPERATIONAL_RENDER_PROFILE,
  validateOperationalRenderManifestFile,
  writeOperationalRenderManifest,
} from "./operational-render-manifest.mjs";

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

function prepareRunDirectory() {
  const runDir = mkdtempSync(join(tmpdir(), "trendzip-render-manifest-"));
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
  return runDir;
}

const videoMetadata = {
  durationMillis: 36_000,
  width: 1_080,
  height: 1_920,
  fps: 30,
  videoCodec: "h264",
  audioCodec: "aac",
  pixelFormat: "yuv420p",
};

test("render manifest binds source, audio, props, video, and still hashes", () => {
  const runDir = prepareRunDirectory();
  try {
    const manifest = createOperationalRenderManifest({
      runDir,
      videoMetadata,
      stillFiles: ["stills/01-hook.png"],
      createdAt: "2026-08-27T18:00:00.000Z",
    });
    writeOperationalRenderManifest(resolve(runDir, "render-manifest.json"), manifest);

    const validated = validateOperationalRenderManifestFile(runDir);
    assert.match(validated.manifest.artifactHash, /^[0-9a-f]{64}$/);
    assert.equal(validated.manifest.renderProfile, OPERATIONAL_RENDER_PROFILE);
    assert.equal(validated.manifest.playbackRate, OPERATIONAL_PUBLIC_CANDIDATE_PLAYBACK_RATE);
    assert.equal(validated.manifest.shortformContentId, 1);
    assert.equal(validated.manifest.tts.voice, "test-voice");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("render manifest rejects public candidate props rendered at the normal speed", () => {
  const runDir = prepareRunDirectory();
  try {
    const manifest = createOperationalRenderManifest({
      runDir,
      videoMetadata,
      stillFiles: ["stills/01-hook.png"],
    });
    writeOperationalRenderManifest(resolve(runDir, "render-manifest.json"), manifest);

    const renderPropsPath = resolve(runDir, "render-props.json");
    const renderProps = JSON.parse(readFileSync(renderPropsPath, "utf8"));
    renderProps.timeline.playbackRate = 1;
    writeFileSync(renderPropsPath, JSON.stringify(renderProps));

    assert.throws(
      () => validateOperationalRenderManifestFile(runDir, { verifyFiles: false }),
      /must use 1.3x playback/,
    );
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("render manifest rejects a non-null internal label in public candidate props", () => {
  const runDir = prepareRunDirectory();
  try {
    const manifest = createOperationalRenderManifest({
      runDir,
      videoMetadata,
      stillFiles: ["stills/01-hook.png"],
    });
    writeOperationalRenderManifest(resolve(runDir, "render-manifest.json"), manifest);

    const renderPropsPath = resolve(runDir, "render-props.json");
    const renderProps = JSON.parse(readFileSync(renderPropsPath, "utf8"));
    renderProps.sampleLabel = "운영 검수본";
    writeFileSync(renderPropsPath, JSON.stringify(renderProps));

    assert.throws(
      () => validateOperationalRenderManifestFile(runDir, { verifyFiles: false }),
      /must set sampleLabel to null/,
    );
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("render manifest rejects a video changed after artifact creation", () => {
  const runDir = prepareRunDirectory();
  try {
    const manifest = createOperationalRenderManifest({
      runDir,
      videoMetadata,
      stillFiles: ["stills/01-hook.png"],
    });
    writeOperationalRenderManifest(resolve(runDir, "render-manifest.json"), manifest);
    writeFileSync(resolve(runDir, "video.mp4"), Buffer.alloc(10_000, 3));

    assert.throws(
      () => validateOperationalRenderManifestFile(runDir),
      /video.mp4/,
    );
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
