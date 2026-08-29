import assert from "node:assert/strict";
import test from "node:test";

import { deriveEvidenceVideoIds } from "./editorial-evidence.mjs";

test("evidence video IDs are empty when there are no claims", () => {
  assert.deepEqual(deriveEvidenceVideoIds([]), []);
});

test("evidence video IDs preserve claim order while removing duplicates", () => {
  assert.deepEqual(
    deriveEvidenceVideoIds([
      { evidenceVideoId: "video-2" },
      { evidenceVideoId: "video-1" },
      { evidenceVideoId: "video-2" },
    ]),
    ["video-2", "video-1"],
  );
});

test("evidence video IDs reject a claim without a usable video ID", () => {
  assert.throws(
    () => deriveEvidenceVideoIds([{ evidenceVideoId: "" }]),
    /evidenceClaims\[0\]\.evidenceVideoId must be a non-empty string/,
  );
});
