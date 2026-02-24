import React from "react";
import { AbsoluteFill, Series, OffthreadVideo } from "remotion";
import type { CompositionProps } from "../types";

export const VideoComposition: React.FC<CompositionProps> = ({ clips, fps }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {clips.map((clip, index) => {
          const startFrame = Math.round((clip.startTimeMs / 1000) * fps);
          const endFrame = Math.round((clip.endTimeMs / 1000) * fps);
          const durationInFrames = endFrame - startFrame;

          return (
            <Series.Sequence key={index} durationInFrames={durationInFrames}>
              <AbsoluteFill>
                <OffthreadVideo
                  src={clip.url}
                  trimBefore={startFrame}
                  trimAfter={endFrame}
                  style={{ width: "100%", height: "100%" }}
                />
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
