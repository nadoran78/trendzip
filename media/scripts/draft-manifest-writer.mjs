import { mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function writeOperationalDraftManifest({ manifest, outputDirectory }) {
  if (!manifest?.contentHash) {
    throw new Error("A completed operational draft manifest is required.");
  }

  await mkdir(outputDirectory, { recursive: true });
  const outputPath = resolve(outputDirectory, `${manifest.contentHash}.json`);
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  return outputPath;
}
