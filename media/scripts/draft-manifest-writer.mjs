import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function writeJsonAtomically(outputPath, value) {
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
}

export async function writeOperationalDraftManifest({ manifest, outputDirectory }) {
  if (!manifest?.contentHash) {
    throw new Error("A completed operational draft manifest is required.");
  }

  await mkdir(outputDirectory, { recursive: true });
  const outputPath = resolve(outputDirectory, `${manifest.contentHash}.json`);
  await writeJsonAtomically(outputPath, manifest);
  return outputPath;
}

export async function writeOperationalDryRunReport({ report, outputDirectory }) {
  if (report?.mode !== "DRY_RUN" || !report.generatedAt || !Array.isArray(report.iterations)) {
    throw new Error("A completed operational dry-run report is required.");
  }

  await mkdir(outputDirectory, { recursive: true });
  const timestamp = report.generatedAt.replaceAll(":", "-");
  const outputPath = resolve(outputDirectory, `dry-run-${timestamp}.json`);
  await writeJsonAtomically(outputPath, report);
  return outputPath;
}
