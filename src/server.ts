import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { bearerAuth } from "hono/bearer-auth";
import { createReadStream, createWriteStream, unlinkSync, statSync } from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";
import path from "path";
import os from "os";
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

async function downloadClip(url: string): Promise<string> {
  const dest = path.join(os.tmpdir(), `input-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp4`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  if (!res.body) throw new Error(`No body in response for ${url}`);
  const fileStream = createWriteStream(dest);
  
  // @ts-ignore - Readable.fromWeb expects a Node.js web stream wrapper
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
  return dest;
}

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
    `Rendering ${request.clips.length} clip(s) at ${request.fps}fps, ${request.width}x${request.height}`
  );

  const downloadedFiles: string[] = [];

  try {
    console.log("Downloading clips locally...");
    const localClips = await Promise.all(
      request.clips.map(async (clip) => {
        console.log(`Downloading ${clip.url}...`);
        const localPath = await downloadClip(clip.url);
        downloadedFiles.push(localPath);
        return {
          ...clip,
          url: `file://${localPath}`,
        };
      })
    );

    const localRequest = { ...request, clips: localClips };
    const outputPath = await renderVideo(localRequest);
    downloadedFiles.push(outputPath);

    // Stream the file back
    const stat = statSync(outputPath);
    const readStream = createReadStream(outputPath);

    // Convert Node.js Readable to Web ReadableStream
    const webStream = Readable.toWeb(readStream) as ReadableStream;

    // Clean up temp file after streaming
    readStream.on("close", () => {
      for (const file of downloadedFiles) {
        try {
          unlinkSync(file);
          console.log("Cleaned up temp file:", file);
        } catch {
          // Ignore cleanup errors
        }
      }
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
    for (const file of downloadedFiles) {
      try {
        unlinkSync(file);
        console.log("Cleaned up temp file after error:", file);
      } catch {
        // Ignore
      }
    }

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
