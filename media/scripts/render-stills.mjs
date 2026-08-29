import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { loadFixture } from "./fixture.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");
const fixturePath = resolve(mediaDir, process.argv[2] ?? "fixtures/made-in-korea.sample.json");
const outputDir = resolve(mediaDir, process.argv[3] ?? "out/stills");
const cliPath = resolve(
  mediaDir,
  "node_modules/.bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion",
);
const stills = [
  ["01-hook.png", 75],
  ["02-overview.png", 255],
  ["03-reasons.png", 540],
  ["04-evidence.png", 840],
  ["05-cta.png", 1020],
];

loadFixture(fixturePath);
mkdirSync(outputDir, { recursive: true });

for (const [filename, frame] of stills) {
  const outputPath = resolve(outputDir, filename);
  const render = spawnSync(
    cliPath,
    [
      "still",
      "src/index.ts",
      "TrendKeywordShort",
      outputPath,
      `--frame=${frame}`,
      `--props=${fixturePath}`,
      "--image-format=png",
      "--overwrite",
    ],
    { cwd: mediaDir, stdio: "inherit" },
  );

  if (render.error) {
    throw render.error;
  }
  if (render.status !== 0) {
    process.exit(render.status ?? 1);
  }
}
