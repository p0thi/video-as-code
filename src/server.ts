import "dotenv/config";
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
    `Rendering ${request.clips.length} clip(s) at ${request.fps}fps, ${request.width}x${request.height}`
  );

  try {
    const { outputPath, cleanup } = await renderVideo(request);

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
