import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { loadNarratedRenderInput } from "./narrated-props.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");
const fixturePath = resolve(mediaDir, process.argv[2] ?? "fixtures/made-in-korea.sample.json");
const manifestPath = resolve(mediaDir, process.argv[3] ?? "out/tts/audio-manifest.json");
const outputPath = resolve(mediaDir, process.argv[4] ?? "out/made-in-korea-narrated.mp4");
const renderPropsPath = resolve(dirname(outputPath), `.narrated-props-${process.pid}.json`);
const cliPath = resolve(
  mediaDir,
  "node_modules/.bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion",
);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: mediaDir, stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 1}.`);
  }
}

const { publicDir, renderProps } = loadNarratedRenderInput({ fixturePath, manifestPath });

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(renderPropsPath, `${JSON.stringify(renderProps, null, 2)}\n`, "utf8");

try {
  run(cliPath, [
    "render",
    "src/index.ts",
    "TrendKeywordShort",
    outputPath,
    `--props=${renderPropsPath}`,
    `--public-dir=${publicDir}`,
    "--codec=h264",
    "--audio-codec=aac",
    "--color-space=bt709",
    "--crf=18",
    "--overwrite",
  ]);

  run(process.execPath, [
    resolve(scriptsDir, "validate-output.mjs"),
    outputPath,
    fixturePath,
    renderPropsPath,
  ]);
} finally {
  rmSync(renderPropsPath, { force: true });
}
