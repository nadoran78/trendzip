import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import ffprobeStatic from "ffprobe-static";

import { loadFixture } from "./fixture.mjs";
import { validateOutputMetadata } from "./output-metadata.mjs";

const outputPath = resolve(process.argv[2] ?? "out/made-in-korea.mp4");
const fixturePath = resolve(process.argv[3] ?? "fixtures/made-in-korea.sample.json");
const renderPropsPath = process.argv[4] ? resolve(process.argv[4]) : null;
const fixture = loadFixture(fixturePath);
const renderProps = renderPropsPath
  ? JSON.parse(readFileSync(renderPropsPath, "utf8"))
  : null;

if (!existsSync(outputPath) || statSync(outputPath).size < 10_000) {
  throw new Error(`Rendered output is missing or unexpectedly small: ${outputPath}`);
}

const probe = spawnSync(
  ffprobeStatic.path,
  ["-v", "error", "-show_streams", "-show_format", "-of", "json", outputPath],
  { encoding: "utf8" },
);

if (probe.error) {
  throw probe.error;
}
if (probe.status !== 0) {
  process.stderr.write(probe.stderr);
  process.exit(probe.status ?? 1);
}

const metadata = JSON.parse(probe.stdout);
const expectedDurationSeconds = renderProps?.timeline?.durationSeconds ?? fixture.durationSeconds;
const messages = validateOutputMetadata(metadata, {
  expectedDurationSeconds,
  expectAudio: Boolean(renderProps?.narrationAudio),
});

for (const message of messages) {
  process.stdout.write(`PASS ${message}\n`);
}

process.stdout.write(`Validated ${outputPath}\n`);
