import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  createRenderArtifactRegistrationPayload,
  registerOperationalRender,
  reviewOperationalRender,
} from "./operational-review-gate.mjs";
import {
  createTestOperationalRenderRun,
  TEST_VIDEO_METADATA,
} from "../test-support/operational-render-run.mjs";

test("registration records the exact artifact returned by the operations API", async () => {
  const { runDir, manifest } = createTestOperationalRenderRun();
  let capturedPayload;
  const apiClient = {
    async registerRenderArtifact(contentId, payload) {
      capturedPayload = { contentId, payload };
      return {
        content: { id: 1, status: "REVIEW_REQUIRED" },
        artifact: {
          id: 10,
          artifactHash: manifest.artifactHash,
          createdAt: "2026-08-27T18:10:00",
        },
      };
    },
  };

  try {
    const result = await registerOperationalRender({
      runDir,
      apiClient,
      probeVideo: () => ({ ...TEST_VIDEO_METADATA }),
    });

    assert.equal(capturedPayload.contentId, 1);
    assert.deepEqual(
      capturedPayload.payload,
      createRenderArtifactRegistrationPayload(manifest),
    );
    assert.equal(result.manifest.registration.artifactId, 10);
    assert.equal(
      JSON.parse(readFileSync(resolve(runDir, "render-manifest.json"))).registration.contentStatus,
      "REVIEW_REQUIRED",
    );
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("review gate refuses a decision before artifact registration", async () => {
  const { runDir } = createTestOperationalRenderRun();
  try {
    await assert.rejects(
      () => reviewOperationalRender({
        runDir,
        decision: "APPROVED",
        reviewer: "operator",
        reason: "전체 영상을 확인했습니다.",
        apiClient: { reviewRenderArtifact: async () => assert.fail("API must not be called") },
        probeVideo: () => ({ ...TEST_VIDEO_METADATA }),
      }),
      /must be registered before review/,
    );
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("review gate writes an explicit reviewer decision for the registered artifact", async () => {
  const { runDir, manifest } = createTestOperationalRenderRun();
  const probeVideo = () => ({ ...TEST_VIDEO_METADATA });
  const registrationClient = {
    async registerRenderArtifact() {
      return {
        content: { id: 1, status: "REVIEW_REQUIRED" },
        artifact: { id: 10, artifactHash: manifest.artifactHash, createdAt: "2026-08-27T18:10:00" },
      };
    },
  };
  let capturedReview;
  const reviewClient = {
    async reviewRenderArtifact(contentId, review) {
      capturedReview = { contentId, review };
      return {
        content: { id: 1, status: "NEEDS_REVISION" },
        review: {
          id: 20,
          ...review,
          createdAt: "2026-08-27T18:20:00",
        },
      };
    },
  };

  try {
    await registerOperationalRender({ runDir, apiClient: registrationClient, probeVideo });
    const result = await reviewOperationalRender({
      runDir,
      decision: "NEEDS_REVISION",
      reviewer: " operator ",
      reason: " 자막 싱크를 수정해야 합니다. ",
      apiClient: reviewClient,
      probeVideo,
    });

    assert.equal(capturedReview.contentId, 1);
    assert.equal(capturedReview.review.artifactHash, manifest.artifactHash);
    assert.equal(capturedReview.review.reviewer, "operator");
    assert.equal(result.manifest.review.decision, "NEEDS_REVISION");
    assert.equal(result.manifest.review.contentStatus, "NEEDS_REVISION");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
