export function validateOutputMetadata(
  metadata,
  { expectedDurationSeconds, expectAudio },
) {
  const videoStreams = metadata.streams.filter((stream) => stream.codec_type === "video");
  const audioStreams = metadata.streams.filter((stream) => stream.codec_type === "audio");

  if (videoStreams.length !== 1) {
    throw new Error(`Expected exactly one video stream, got ${videoStreams.length}.`);
  }

  const video = videoStreams[0];
  const [fpsNumerator, fpsDenominator] = video.avg_frame_rate.split("/").map(Number);
  const fps = fpsNumerator / fpsDenominator;
  const duration = Number(metadata.format.duration);
  const expectedAudioStreamCount = expectAudio ? 1 : 0;
  const checks = [
    [video.width === 1080 && video.height === 1920, `resolution ${video.width}x${video.height}`],
    [Math.abs(fps - 30) < 0.01, `frame rate ${fps}`],
    [Math.abs(duration - expectedDurationSeconds) < 0.2, `duration ${duration}s`],
    [video.codec_name === "h264", `codec ${video.codec_name}`],
    [video.pix_fmt === "yuv420p", `pixel format ${video.pix_fmt}`],
    [
      audioStreams.length === expectedAudioStreamCount,
      `audio streams ${audioStreams.length}`,
    ],
  ];

  if (expectAudio && audioStreams.length === 1) {
    checks.push([
      audioStreams[0].codec_name === "aac",
      `audio codec ${audioStreams[0].codec_name}`,
    ]);
  }

  const messages = [];
  for (const [passed, message] of checks) {
    if (!passed) {
      throw new Error(`Output validation failed: ${message}`);
    }
    messages.push(message);
  }

  return messages;
}
