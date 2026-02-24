import { z } from "zod";

export const RenderClipSchema = z.object({
  url: z.string().url(),
  startTimeMs: z.number().int().min(0).optional(),
  endTimeMs: z.number().int().min(0).optional(),
});

export const ClipSchema = z.object({
  url: z.string().url(),
  startTimeMs: z.number().int().min(0),
  endTimeMs: z.number().int().min(0),
});

export const RenderRequestSchema = z
  .object({
    clips: z.array(RenderClipSchema).min(1),
    fps: z.number().int().min(1).max(120).default(30),
    width: z.number().int().min(1).max(3840).default(1920),
    height: z.number().int().min(1).max(2160).default(1080),
  })
  .refine(
    (data) => data.clips.every((clip) => {
      if (clip.endTimeMs !== undefined && clip.startTimeMs !== undefined) {
        return clip.endTimeMs > clip.startTimeMs;
      }
      return true;
    }),
    { message: "Each clip's endTimeMs must be greater than startTimeMs" }
  );

export type RenderClip = z.infer<typeof RenderClipSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type RenderRequest = z.infer<typeof RenderRequestSchema>;

export const CompositionPropsSchema = z.object({
  clips: z.array(ClipSchema),
  fps: z.number(),
});

export type CompositionProps = z.infer<typeof CompositionPropsSchema>;
