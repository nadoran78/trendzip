import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { generateTtsAudio } from "./tts-generator.mjs";

export async function createOperationalTtsRun({
  input,
  runDir,
  client,
  requestIntervalMs,
  styleInstruction,
  onSceneStart = () => {},
}) {
  const resolvedRunDir = resolve(runDir);
  if (existsSync(resolvedRunDir)) {
    throw new Error(`Operational render run directory already exists: ${resolvedRunDir}`);
  }

  mkdirSync(dirname(resolvedRunDir), { recursive: true });
  const stagingDir = resolve(
    dirname(resolvedRunDir),
    `.${basename(resolvedRunDir)}-${process.pid}-${randomUUID()}.tmp`,
  );
  mkdirSync(stagingDir, { recursive: true });

  try {
    copyFileSync(input.manifestPath, resolve(stagingDir, "source-manifest.json"));
    writeFileSync(
      resolve(stagingDir, "render-input.json"),
      `${JSON.stringify(input.renderProps, null, 2)}\n`,
      "utf8",
    );
    await generateTtsAudio({
      fixture: input.renderProps,
      client,
      outputDir: resolve(stagingDir, "tts"),
      requestIntervalMs,
      styleInstruction,
      onSceneStart,
    });

    renameSync(stagingDir, resolvedRunDir);
    return resolvedRunDir;
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true });
    throw error;
  }
}
