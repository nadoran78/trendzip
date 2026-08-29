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
const outputDir = resolve(mediaDir, process.argv[4] ?? "out/narrated-stills");
const renderPropsPath = resolve(outputDir, `.narrated-props-${process.pid}.json`);
const cliPath = resolve(
  mediaDir,
  "node_modules/.bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion",
);

function renderStill({ filename, frame }) {
  const result = spawnSync(
    cliPath,
    [
      "still",
      "src/index.ts",
      "TrendKeywordShort",
      resolve(outputDir, filename),
      `--frame=${frame}`,
      `--props=${renderPropsPath}`,
      `--public-dir=${publicDir}`,
      "--image-format=png",
      "--overwrite",
    ],
    { cwd: mediaDir, stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${cliPath} failed with exit code ${result.status ?? 1}.`);
  }
}

const { publicDir, renderProps } = loadNarratedRenderInput({ fixturePath, manifestPath });

mkdirSync(outputDir, { recursive: true });
writeFileSync(renderPropsPath, `${JSON.stringify(renderProps, null, 2)}\n`, "utf8");

try {
  renderProps.timeline.scenes.forEach((scene, index) => {
    renderStill({
      filename: `${String(index + 1).padStart(2, "0")}-${scene.id}.png`,
      frame: scene.from + Math.floor(scene.durationInFrames / 2),
    });
  });
} finally {
  rmSync(renderPropsPath, { force: true });
}
