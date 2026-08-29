import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { createTestOperationalRenderRun } from "../test-support/operational-render-run.mjs";
import { preparePublicCandidateRerender } from "./public-candidate-rerender.mjs";

test("public candidate rerender copies immutable source and audio without replacing the source artifact", () => {
  const { runDir } = createTestOperationalRenderRun();
  const outputRunDir = join(tmpdir(), `trendzip-public-candidate-${process.pid}-${Date.now()}`);
  try {
    const result = preparePublicCandidateRerender({ sourceRunDir: runDir, outputRunDir });

    assert.equal(result.outputRunDir, resolve(outputRunDir));
    assert.equal(result.shortformContentId, 1);
    assert.equal(existsSync(resolve(outputRunDir, "render-manifest.json")), false);
    assert.equal(
      readFileSync(resolve(outputRunDir, "source-manifest.json"), "utf8"),
      readFileSync(resolve(runDir, "source-manifest.json"), "utf8"),
    );
    assert.equal(existsSync(resolve(outputRunDir, "tts/audio-manifest.json")), true);
    assert.equal(existsSync(resolve(runDir, "video.mp4")), true);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
    rmSync(outputRunDir, { recursive: true, force: true });
  }
});

test("public candidate rerender rejects an artifact with a recorded registration", () => {
  const { runDir } = createTestOperationalRenderRun();
  const outputRunDir = join(tmpdir(), `trendzip-public-candidate-${process.pid}-${Date.now()}`);
  try {
    const renderManifestPath = resolve(runDir, "render-manifest.json");
    const renderManifest = JSON.parse(readFileSync(renderManifestPath, "utf8"));
    renderManifest.registration = { artifactId: 1 };
    writeFileSync(renderManifestPath, JSON.stringify(renderManifest));

    assert.throws(
      () => preparePublicCandidateRerender({ sourceRunDir: runDir, outputRunDir }),
      /unregistered and unreviewed/,
    );
    assert.equal(existsSync(outputRunDir), false);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
    rmSync(outputRunDir, { recursive: true, force: true });
  }
});
