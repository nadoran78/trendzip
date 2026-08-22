import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { writeOperationalDraftManifest } from "./draft-manifest-writer.mjs";

test("manifest writer stores an atomic JSON file named by content hash", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "trendzip-operational-draft-"));
  const manifest = { contentHash: "a".repeat(64), status: "DRAFT" };

  try {
    const outputPath = await writeOperationalDraftManifest({ manifest, outputDirectory });

    assert.equal(outputPath, join(outputDirectory, `${manifest.contentHash}.json`));
    assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), manifest);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
