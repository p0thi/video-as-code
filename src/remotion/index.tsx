import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoComposition } from "./Composition";
import type { CompositionProps } from "../types.js";
import { CompositionPropsSchema } from "../types.js";


const calculateDurationInFrames = (props: CompositionProps): number => {
  return props.clips.reduce((total, clip) => {
    return total + Math.round(((clip.endTimeMs - clip.startTimeMs) / 1000) * props.fps);
  }, 0);
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      schema={CompositionPropsSchema}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        clips: [],
        fps: 30,
      }}
      calculateMetadata={async ({ props }) => {
        return {
          durationInFrames: Math.max(1, calculateDurationInFrames(props)),
          fps: props.fps,
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
