import path from "path";
import os from "os";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RenderRequest } from "./types.js";

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

export interface RenderResult {
  outputPath: string;
  cleanup: () => void;
}

export async function renderVideo(request: RenderRequest): Promise<RenderResult> {
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
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0) {
        console.log(`Render progress: ${Math.round(progress * 100)}%`);
      }
    },
  });

  console.log("Render complete:", outputPath);

  const cleanup = () => {
    // Delete the final output MP4 explicitly.
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch {
      // Ignore
    }

    // Attempt to sweep any dangling Remotion OffthreadVideo assets from aborted runs.
    try {
      const tmpDir = os.tmpdir();
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        if (file.startsWith("remotion-v") && file.endsWith("-assets")) {
          const fullPath = path.join(tmpDir, file);
          const stat = fs.statSync(fullPath);
          // Only aggressively sweep folders older than 10 minutes to prevent crossing parallel renders
          if (Date.now() - stat.mtimeMs > 10 * 60 * 1000) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to sweep stale Remotion asset directories:", err);
    }
  };

  return { outputPath, cleanup };
}
