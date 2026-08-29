import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateOperationalRenderManifest } from "./operational-render-input.mjs";
import { renderOperationalTtsRun } from "./operational-renderer.mjs";
import { preparePublicCandidateRerender } from "./public-candidate-rerender.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");

function createDefaultRunDirectory(shortformContentId) {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  return resolve(mediaDir, "out/operational-renders", String(shortformContentId), `${timestamp}-public`);
}

function recordLatestRun(runDir) {
  const latestRunPath = resolve(mediaDir, "out/operational-renders/.latest-run");
  mkdirSync(dirname(latestRunPath), { recursive: true });
  const temporaryPath = `${latestRunPath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${runDir}\n`, "utf8");
  renameSync(temporaryPath, latestRunPath);
}

const sourceRunArgument = process.argv[2];
if (!sourceRunArgument) {
  throw new Error("Usage: npm run render:public-candidate -- <source-run-directory> [output-run-directory]");
}

const sourceRunDir = resolve(mediaDir, sourceRunArgument);
const sourceManifest = validateOperationalRenderManifest(
  JSON.parse(readFileSync(resolve(sourceRunDir, "source-manifest.json"), "utf8")),
);
const outputRunDir = process.argv[3]
  ? resolve(mediaDir, process.argv[3])
  : createDefaultRunDirectory(sourceManifest.reservation.shortformContentId);

preparePublicCandidateRerender({ sourceRunDir, outputRunDir });
let result;
try {
  result = renderOperationalTtsRun(outputRunDir);
} catch (error) {
  if (existsSync(outputRunDir)) {
    rmSync(outputRunDir, { recursive: true, force: true });
  }
  throw error;
}

process.stdout.write(`Rendered public candidate video: ${result.videoPath}\n`);
process.stdout.write(`Rendered public candidate stills: ${result.stillsDir}\n`);
process.stdout.write(`Created render manifest: ${result.renderManifestPath}\n`);
process.stdout.write(`Artifact hash: ${result.renderManifest.artifactHash}\n`);
recordLatestRun(outputRunDir);
process.stdout.write("Updated the latest public candidate run.\n");
