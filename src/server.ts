import "dotenv/config";
import { RenderInternals } from "@remotion/renderer";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { bearerAuth } from "hono/bearer-auth";
import { createReadStream, unlinkSync, statSync } from "fs";
import { Readable } from "stream";
import { RenderRequestSchema } from "./types.js";
import { renderVideo } from "./render.js";

// Ensure the API Bearer token is provided at startup
const API_TOKEN = process.env.API_BEARER_TOKEN;
if (!API_TOKEN) {
  console.error(
    "FATAL ERROR: API_BEARER_TOKEN environment variable is not set."
  );
  process.exit(1);
}

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/render", bearerAuth({ token: API_TOKEN }), async (c) => {
  // Parse and validate request body
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const result = RenderRequestSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: "Validation failed",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400
    );
  }

  const request = result.data;

  console.log(
    `Processing payload for ${request.clips.length} clip(s) at ${request.fps}fps, ${request.width}x${request.height}`
  );

  try {
    // Resolve missing start/end timings dynamically
    const resolvedClips = await Promise.all(
      request.clips.map(async (clip) => {
        let startTimeMs = clip.startTimeMs ?? 0;
        let endTimeMs = clip.endTimeMs;

        if (endTimeMs === undefined) {
          try {
            console.log(`Fetching metadata for ${clip.url}...`);
            const ffprobePath = RenderInternals.getExecutablePath({
              type: "ffprobe",
              indent: false,
              logLevel: "error",
              binariesDirectory: null,
            });

            const ffprobeArgs = [
              "-v", "error",
              "-show_entries", "format=duration",
              "-of", "default=noprint_wrappers=1:nokey=1",
              clip.url,
            ];

            let stdout: string;
            try {
              const result = await RenderInternals.execa(ffprobePath, ffprobeArgs);
              stdout = result.stdout;
            } catch (err) {
              console.warn(`Internal ffprobe failed, trying system ffprobe fallback...`);
              const result = await RenderInternals.execa("ffprobe", ffprobeArgs);
              stdout = result.stdout;
            }

            const durationInSeconds = parseFloat(stdout);

            if (isNaN(durationInSeconds) || durationInSeconds <= 0) {
              throw new Error(`Duration is missing or invalid for video: ${clip.url}`);
            }

            endTimeMs = Math.round(durationInSeconds * 1000);
          } catch (err) {
            throw new Error(`Failed to fetch metadata for clip: ${clip.url}. Error: ${err instanceof Error ? err.message : 'Unknown'}`);
          }
        }

        if (endTimeMs <= startTimeMs) {
          throw new Error(`Resolved endTimeMs (${endTimeMs}) must be strictly greater than startTimeMs (${startTimeMs}) for ${clip.url}`);
        }

        return {
          url: clip.url,
          startTimeMs,
          endTimeMs,
        };
      })
    );

    const resolvedRequest = { ...request, clips: resolvedClips };

    const { outputPath, cleanup } = await renderVideo(resolvedRequest);

    // Stream the file back
    const stat = statSync(outputPath);
    const readStream = createReadStream(outputPath);

    // Convert Node.js Readable to Web ReadableStream
    const webStream = Readable.toWeb(readStream) as ReadableStream;

    // Clean up all temp files (output video + Remotion downloads) after streaming
    readStream.on("close", () => {
      try {
        unlinkSync(outputPath);
        console.log("Cleaned up output file:", outputPath);
      } catch {
        // Ignore cleanup errors
      }
      cleanup();
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size.toString(),
        "Content-Disposition": 'attachment; filename="output.mp4"',
      },
    });
  } catch (error) {
    console.error("Render failed:", error);
    return c.json(
      {
        error: "Render failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

const port = parseInt(process.env.PORT || "3000", 10);

console.log(`Starting video-as-code server on port ${port}...`);
serve({
  fetch: app.fetch,
  port,
});
console.log(`Server running at http://localhost:${port}`);
