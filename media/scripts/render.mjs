import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { loadFixture } from "./fixture.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");
const fixturePath = resolve(mediaDir, process.argv[2] ?? "fixtures/made-in-korea.sample.json");
const outputPath = resolve(mediaDir, process.argv[3] ?? "out/made-in-korea.mp4");
const cliPath = resolve(
  mediaDir,
  "node_modules/.bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion",
);

loadFixture(fixturePath);
mkdirSync(dirname(outputPath), { recursive: true });

const render = spawnSync(
  cliPath,
  [
    "render",
    "src/index.ts",
    "TrendKeywordShort",
    outputPath,
    `--props=${fixturePath}`,
    "--codec=h264",
    "--color-space=bt709",
    "--muted",
    "--crf=18",
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

const validate = spawnSync(
  process.execPath,
  [resolve(scriptsDir, "validate-output.mjs"), outputPath, fixturePath],
  { cwd: mediaDir, stdio: "inherit" },
);

if (validate.error) {
  throw validate.error;
}
process.exit(validate.status ?? 1);
