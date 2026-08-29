import { resolve } from "node:path";

import { renderOperationalTtsRun } from "./operational-renderer.mjs";

const runDirectory = process.argv[2];
if (!runDirectory) {
  throw new Error("Usage: npm run render:operational -- <run-directory>");
}

const result = renderOperationalTtsRun(resolve(runDirectory));
process.stdout.write(`Rendered operational video: ${result.videoPath}\n`);
process.stdout.write(`Rendered public candidate stills: ${result.stillsDir}\n`);
process.stdout.write(`Created render manifest: ${result.renderManifestPath}\n`);
process.stdout.write(`Artifact hash: ${result.renderManifest.artifactHash}\n`);
