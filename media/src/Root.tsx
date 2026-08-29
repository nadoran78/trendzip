import { Composition } from "remotion";

import sampleFixture from "../fixtures/made-in-korea.sample.json";
import { TrendKeywordShort } from "./TrendKeywordShort";
import type { KeywordShortformProps } from "./types";

export const COMPOSITION_ID = "TrendKeywordShort";
export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
const DEFAULT_PROPS = sampleFixture as KeywordShortformProps;

export function RemotionRoot() {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={TrendKeywordShort}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      fps={VIDEO_FPS}
      durationInFrames={DEFAULT_PROPS.durationSeconds * VIDEO_FPS}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({ props }) => ({
        durationInFrames:
          props.timeline?.durationInFrames ?? Math.round(props.durationSeconds * VIDEO_FPS),
      })}
    />
  );
}
