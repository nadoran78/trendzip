import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import ffprobeStatic from "ffprobe-static";

import { createNarratedRenderProps } from "./narrated-props.mjs";
import {
  createOperationalRenderProps,
  validateOperationalRenderManifest,
} from "./operational-render-input.mjs";
import { OPERATIONAL_PUBLIC_CANDIDATE_TIMELINE_OPTIONS } from "./operational-render-profile.mjs";
import {
  createOperationalRenderManifest,
  writeOperationalRenderManifest,
} from "./operational-render-manifest.mjs";
import { validateOutputMetadata } from "./output-metadata.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");
const cliPath = resolve(
  mediaDir,
  "node_modules/.bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion",
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: mediaDir,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 1}.`);
  }
  return result;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function probeOperationalVideo(videoPath, expectedDurationSeconds) {
  const probe = spawnSync(
    ffprobeStatic.path,
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", videoPath],
    { encoding: "utf8" },
  );
  if (probe.error) throw probe.error;
  if (probe.status !== 0) {
    throw new Error(`ffprobe failed: ${probe.stderr.trim()}`);
  }

  const metadata = JSON.parse(probe.stdout);
  validateOutputMetadata(metadata, { expectedDurationSeconds, expectAudio: true });
  const video = metadata.streams.find((stream) => stream.codec_type === "video");
  const audio = metadata.streams.find((stream) => stream.codec_type === "audio");
  const [fpsNumerator, fpsDenominator] = video.avg_frame_rate.split("/").map(Number);

  return {
    durationMillis: Math.round(Number(metadata.format.duration) * 1_000),
    width: video.width,
    height: video.height,
    fps: fpsNumerator / fpsDenominator,
    videoCodec: video.codec_name,
    audioCodec: audio.codec_name,
    pixelFormat: video.pix_fmt,
  };
}

function renderVideo({ runDir, renderPropsPath, outputPath }) {
  run(cliPath, [
    "render",
    "src/index.ts",
    "TrendKeywordShort",
    outputPath,
    `--props=${renderPropsPath}`,
    `--public-dir=${runDir}`,
    "--codec=h264",
    "--audio-codec=aac",
    "--color-space=bt709",
    "--crf=18",
    "--overwrite",
  ]);
}

function renderStills({ runDir, renderPropsPath, renderProps, outputDir }) {
  mkdirSync(outputDir, { recursive: true });
  return renderProps.timeline.scenes.map((scene, index) => {
    const filename = `${String(index + 1).padStart(2, "0")}-${scene.id}.png`;
    run(cliPath, [
      "still",
      "src/index.ts",
      "TrendKeywordShort",
      resolve(outputDir, filename),
      `--frame=${scene.from + Math.floor(scene.durationInFrames / 2)}`,
      `--props=${renderPropsPath}`,
      `--public-dir=${runDir}`,
      "--image-format=png",
      "--overwrite",
    ]);
    return filename;
  });
}

export function renderOperationalTtsRun(runDirectory) {
  const runDir = resolve(runDirectory);
  const renderManifestPath = resolve(runDir, "render-manifest.json");
  if (existsSync(renderManifestPath)) {
    throw new Error(`Operational run is already rendered: ${renderManifestPath}`);
  }

  const sourceManifest = validateOperationalRenderManifest(
    readJson(resolve(runDir, "source-manifest.json")),
  );
  const baseProps = createOperationalRenderProps(sourceManifest);
  const audioManifestPath = resolve(runDir, "tts/audio-manifest.json");
  if (!existsSync(audioManifestPath)) {
    throw new Error("Operational TTS audio manifest is missing.");
  }
  const audioManifest = readJson(audioManifestPath);
  const renderProps = createNarratedRenderProps({
    fixture: baseProps,
    manifest: audioManifest,
    audioDir: resolve(runDir, "tts"),
    audioPublicPath: "tts",
    timelineOptions: OPERATIONAL_PUBLIC_CANDIDATE_TIMELINE_OPTIONS,
  });

  const renderPropsPath = resolve(runDir, "render-props.json");
  const temporaryVideoPath = resolve(runDir, `.video-${process.pid}.tmp.mp4`);
  const videoPath = resolve(runDir, "video.mp4");
  const temporaryStillsDir = resolve(runDir, `.stills-${process.pid}.tmp`);
  const stillsDir = resolve(runDir, "stills");

  rmSync(temporaryVideoPath, { force: true });
  rmSync(temporaryStillsDir, { recursive: true, force: true });
  rmSync(videoPath, { force: true });
  rmSync(stillsDir, { recursive: true, force: true });
  writeFileSync(renderPropsPath, `${JSON.stringify(renderProps, null, 2)}\n`, "utf8");

  try {
    renderVideo({ runDir, renderPropsPath, outputPath: temporaryVideoPath });
    const videoMetadata = probeOperationalVideo(
      temporaryVideoPath,
      renderProps.timeline.durationSeconds,
    );
    const stillFilenames = renderStills({
      runDir,
      renderPropsPath,
      renderProps,
      outputDir: temporaryStillsDir,
    });

    renameSync(temporaryVideoPath, videoPath);
    renameSync(temporaryStillsDir, stillsDir);
    const stillFiles = stillFilenames.map((filename) => `stills/${filename}`);
    const renderManifest = createOperationalRenderManifest({
      runDir,
      videoMetadata,
      stillFiles,
    });
    writeOperationalRenderManifest(renderManifestPath, renderManifest);
    return { renderManifest, renderManifestPath, videoPath, stillsDir };
  } catch (error) {
    rmSync(temporaryVideoPath, { force: true });
    rmSync(temporaryStillsDir, { recursive: true, force: true });
    rmSync(videoPath, { force: true });
    rmSync(stillsDir, { recursive: true, force: true });
    rmSync(renderPropsPath, { force: true });
    throw error;
  }
}
