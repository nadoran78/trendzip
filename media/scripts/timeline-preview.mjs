import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateAudioManifest } from "./audio-manifest.mjs";
import { loadFixture } from "./fixture.mjs";
import { calculateSceneTimeline } from "./timeline.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const mediaDir = resolve(scriptsDir, "..");
const fixturePath = resolve(mediaDir, process.argv[2] ?? "fixtures/made-in-korea.sample.json");
const manifestPath = resolve(mediaDir, process.argv[3] ?? "out/tts/audio-manifest.json");

const fixture = loadFixture(fixturePath);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
validateAudioManifest(manifest, fixture);

const timeline = calculateSceneTimeline(manifest);
process.stdout.write(`${JSON.stringify(timeline, null, 2)}\n`);
