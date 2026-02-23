import path from "path";
import os from "os";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RenderRequest, CompositionProps } from "./types.js";

let bundleLocation: string | null = null;

async function ensureBundle(): Promise<string> {
  if (bundleLocation) {
    return bundleLocation;
  }

  console.log("Creating Remotion bundle...");
  bundleLocation = await bundle({
    entryPoint: path.resolve("src/remotion/index.tsx"),
    webpackOverride: (config) => config,
  });
  console.log("Bundle created at:", bundleLocation);

  return bundleLocation;
}

export async function renderVideo(request: RenderRequest): Promise<string> {
  const serveUrl = await ensureBundle();

  const inputProps: Record<string, unknown> = {
    clips: request.clips,
    fps: request.fps,
  };

  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl,
    id: "VideoComposition",
    inputProps,
  });

  // Override dimensions from the request
  composition.width = request.width;
  composition.height = request.height;

  const outputPath = path.join(
    os.tmpdir(),
    `video-as-code-${Date.now()}.mp4`
  );

  console.log("Rendering video to:", outputPath);
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    chromiumOptions: {
      disableWebSecurity: true,
    },
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0) {
        console.log(`Render progress: ${Math.round(progress * 100)}%`);
      }
    },
  });

  console.log("Render complete:", outputPath);
  return outputPath;
}
