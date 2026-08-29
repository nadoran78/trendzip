import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, "../..");
const generateScript = resolve(repoRoot, "scripts/ops/generate-shortform.sh");
const reviewScript = resolve(repoRoot, "scripts/ops/review-shortform.sh");

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createDraftManifest(path, shortformContentId = 7) {
  writeJson(path, {
    schemaVersion: 4,
    status: "DRAFT",
    contentHash: "b".repeat(64),
    reservation: { shortformContentId, status: "DRAFT" },
  });
  return path;
}

function createRenderRun(runDir, shortformContentId = 7) {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(resolve(runDir, "video.mp4"), "fake-video", "utf8");
  writeJson(resolve(runDir, "render-manifest.json"), {
    schemaVersion: 1,
    status: "LOCAL_RENDERED",
    shortformContentId,
    artifactHash: "a".repeat(64),
    files: { video: "video.mp4" },
    reviewChecklist: ["전체 영상 재생", "발음과 자막 확인"],
    sourceReviewWarnings: [],
    registration: null,
    review: null,
  });
}

function writeFakeNpm(path) {
  writeFileSync(
    path,
    `#!/usr/bin/env node
const {appendFileSync, mkdirSync, readFileSync, writeFileSync} = require("node:fs");
const {dirname, resolve} = require("node:path");

const args = process.argv.slice(2);
const runIndex = args.indexOf("run");
const script = runIndex >= 0 ? args[runIndex + 1] : "";
const separatorIndex = args.indexOf("--");
const forwarded = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : [];
appendFileSync(process.env.FAKE_NPM_CALL_LOG, JSON.stringify({script, forwarded}) + "\\n");

if (process.env.FAKE_FAIL_SCRIPT === script) {
  process.stderr.write("forced failure: " + script + "\\n");
  process.exit(9);
}

if (script === "draft:prepare") {
  if (process.env.FAKE_PREPARE_STATUS) process.exit(Number(process.env.FAKE_PREPARE_STATUS));
  process.stdout.write(JSON.stringify({outputPath: process.env.FAKE_DRAFT_MANIFEST}) + "\\n");
} else if (script === "tts:operational") {
  mkdirSync(forwarded[1], {recursive: true});
} else if (script === "render:operational") {
  const runDir = forwarded[0];
  const draft = JSON.parse(readFileSync(process.env.FAKE_DRAFT_MANIFEST, "utf8"));
  mkdirSync(runDir, {recursive: true});
  writeFileSync(resolve(runDir, "video.mp4"), "fake-video");
  writeFileSync(resolve(runDir, "render-manifest.json"), JSON.stringify({
    schemaVersion: 1,
    status: "LOCAL_RENDERED",
    shortformContentId: draft.reservation.shortformContentId,
    artifactHash: "a".repeat(64),
    files: {video: "video.mp4"},
    reviewChecklist: ["전체 영상 재생", "발음과 자막 확인"],
    sourceReviewWarnings: [],
    registration: null,
    review: null,
  }, null, 2) + "\\n");
} else if (script === "draft:register") {
  const manifestPath = resolve(forwarded[0], "render-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.registration = {
    artifactId: 31,
    artifactHash: manifest.artifactHash,
    contentStatus: "REVIEW_REQUIRED",
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\\n");
} else if (script === "draft:review") {
  const manifestPath = resolve(forwarded[0], "render-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const option = (name) => forwarded.find((value) => value.startsWith("--" + name + "="))?.split("=").slice(1).join("=");
  const decision = option("decision");
  manifest.review = {
    decision,
    reviewer: option("reviewer"),
    reason: option("reason"),
    contentStatus: decision,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\\n");
}
`,
    "utf8",
  );
  chmodSync(path, 0o755);
}

function createHarness() {
  const root = mkdtempSync(resolve(tmpdir(), "trendzip-shortform-shell-"));
  const mediaDir = resolve(root, "media");
  const draftPath = createDraftManifest(
    resolve(mediaDir, "out/operational-drafts/draft.json"),
  );
  const fakeNpm = resolve(root, "fake-npm");
  const callLog = resolve(root, "npm-calls.jsonl");
  writeFakeNpm(fakeNpm);
  writeFileSync(callLog, "", "utf8");

  return {
    root,
    mediaDir,
    draftPath,
    callLog,
    env: {
      ...process.env,
      TRENDZIP_MEDIA_DIR: mediaDir,
      TRENDZIP_NPM_BIN: fakeNpm,
      TRENDZIP_NODE_BIN: process.execPath,
      FAKE_NPM_CALL_LOG: callLog,
      FAKE_DRAFT_MANIFEST: draftPath,
      USER: "reviewer",
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function readCalls(path) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("generation shell creates TTS and render output without registering it", () => {
  const harness = createHarness();
  try {
    const result = spawnSync("/bin/bash", [generateScript, harness.draftPath], {
      env: harness.env,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readCalls(harness.callLog).map(({ script }) => script),
      ["tts:operational", "render:operational"],
    );
    const latestRun = readFileSync(
      resolve(harness.mediaDir, "out/operational-renders/.latest-run"),
      "utf8",
    ).trim();
    assert.equal(readFileSync(resolve(latestRun, "video.mp4"), "utf8"), "fake-video");
    assert.match(result.stdout, /Review the full video before recording a decision/);
  } finally {
    harness.cleanup();
  }
});

test("generation shell prepares a draft when no manifest is provided", () => {
  const harness = createHarness();
  try {
    const result = spawnSync("/bin/bash", [generateScript], {
      env: harness.env,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readCalls(harness.callLog).map(({ script }) => script),
      ["draft:prepare", "tts:operational", "render:operational"],
    );
  } finally {
    harness.cleanup();
  }
});

test("generation shell stops before TTS when draft preparation is held", () => {
  const harness = createHarness();
  try {
    const result = spawnSync("/bin/bash", [generateScript], {
      env: { ...harness.env, FAKE_PREPARE_STATUS: "2" },
      encoding: "utf8",
    });

    assert.equal(result.status, 2);
    assert.deepEqual(
      readCalls(harness.callLog).map(({ script }) => script),
      ["draft:prepare"],
    );
    assert.match(result.stderr, /held or blocked/);
  } finally {
    harness.cleanup();
  }
});

test("generation shell stops before rendering when TTS fails", () => {
  const harness = createHarness();
  try {
    const result = spawnSync("/bin/bash", [generateScript, harness.draftPath], {
      env: { ...harness.env, FAKE_FAIL_SCRIPT: "tts:operational" },
      encoding: "utf8",
    });

    assert.equal(result.status, 9);
    assert.deepEqual(
      readCalls(harness.callLog).map(({ script }) => script),
      ["tts:operational"],
    );
    assert.equal(
      readFileSync(harness.callLog, "utf8").includes("render:operational"),
      false,
    );
  } finally {
    harness.cleanup();
  }
});

test("review shell registers once and records an explicit decision", () => {
  const harness = createHarness();
  try {
    const runDir = resolve(harness.mediaDir, "out/operational-renders/7/review-run");
    createRenderRun(runDir);
    const result = spawnSync(
      "/bin/bash",
      [
        reviewScript,
        runDir,
        "--decision=APPROVED",
        "--reviewer=reviewer",
        "--reason=전체 영상을 확인했습니다.",
      ],
      {
        env: harness.env,
        input: "APPROVED\n",
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readCalls(harness.callLog).map(({ script }) => script),
      ["draft:register", "draft:review"],
    );
    const manifest = JSON.parse(readFileSync(resolve(runDir, "render-manifest.json"), "utf8"));
    assert.equal(manifest.registration.artifactId, 31);
    assert.equal(manifest.review.decision, "APPROVED");

    const replay = spawnSync("/bin/bash", [reviewScript, runDir], {
      env: harness.env,
      encoding: "utf8",
    });
    assert.equal(replay.status, 0, replay.stderr);
    assert.match(replay.stdout, /already has a review decision: APPROVED/);
    assert.equal(readCalls(harness.callLog).length, 2);
  } finally {
    harness.cleanup();
  }
});

test("review shell resumes from an existing registration", () => {
  const harness = createHarness();
  try {
    const runDir = resolve(harness.mediaDir, "out/operational-renders/7/resume-run");
    createRenderRun(runDir);
    const manifestPath = resolve(runDir, "render-manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.registration = {
      artifactId: 31,
      artifactHash: manifest.artifactHash,
      contentStatus: "REVIEW_REQUIRED",
    };
    writeJson(manifestPath, manifest);

    const result = spawnSync(
      "/bin/bash",
      [
        reviewScript,
        runDir,
        "--decision=NEEDS_REVISION",
        "--reviewer=reviewer",
        "--reason=발음 수정이 필요합니다.",
      ],
      {
        env: harness.env,
        input: "NEEDS_REVISION\n",
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readCalls(harness.callLog).map(({ script }) => script),
      ["draft:review"],
    );
    assert.match(result.stdout, /Skipping registration/);
    const reviewedManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(reviewedManifest.review.decision, "NEEDS_REVISION");
  } finally {
    harness.cleanup();
  }
});

test("review shell cancellation leaves the artifact unregistered", () => {
  const harness = createHarness();
  try {
    const runDir = resolve(harness.mediaDir, "out/operational-renders/7/cancelled-run");
    createRenderRun(runDir);
    const result = spawnSync(
      "/bin/bash",
      [
        reviewScript,
        runDir,
        "--decision=REJECTED",
        "--reviewer=reviewer",
        "--reason=재작업이 필요합니다.",
      ],
      {
        env: harness.env,
        input: "NO\n",
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 3);
    assert.match(result.stdout, /Nothing was registered or recorded/);
    assert.equal(readCalls(harness.callLog).length, 0);
  } finally {
    harness.cleanup();
  }
});
