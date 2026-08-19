import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import ffprobeStatic from "ffprobe-static";

import { loadFixture } from "./fixture.mjs";

const outputPath = resolve(process.argv[2] ?? "out/made-in-korea.mp4");
const fixturePath = resolve(process.argv[3] ?? "fixtures/made-in-korea.sample.json");
const fixture = loadFixture(fixturePath);

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
const videoStreams = metadata.streams.filter((stream) => stream.codec_type === "video");
const audioStreams = metadata.streams.filter((stream) => stream.codec_type === "audio");

if (videoStreams.length !== 1) {
  throw new Error(`Expected exactly one video stream, got ${videoStreams.length}.`);
}

const video = videoStreams[0];
const [fpsNumerator, fpsDenominator] = video.avg_frame_rate.split("/").map(Number);
const fps = fpsNumerator / fpsDenominator;
const duration = Number(metadata.format.duration);

const checks = [
  [video.width === 1080 && video.height === 1920, `resolution ${video.width}x${video.height}`],
  [Math.abs(fps - 30) < 0.01, `frame rate ${fps}`],
  [Math.abs(duration - fixture.durationSeconds) < 0.2, `duration ${duration}s`],
  [video.codec_name === "h264", `codec ${video.codec_name}`],
  [video.pix_fmt === "yuv420p", `pixel format ${video.pix_fmt}`],
  [audioStreams.length === 0, `audio streams ${audioStreams.length}`],
];

for (const [passed, message] of checks) {
  if (!passed) {
    throw new Error(`Output validation failed: ${message}`);
  }
  process.stdout.write(`PASS ${message}\n`);
}

process.stdout.write(`Validated ${outputPath}\n`);
