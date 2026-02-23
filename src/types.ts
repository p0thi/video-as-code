import { z } from "zod";

export const ClipSchema = z.object({
  url: z.string().url(),
  startTimeMs: z.number().int().min(0),
  endTimeMs: z.number().int().min(0),
});

export const RenderRequestSchema = z
  .object({
    clips: z.array(ClipSchema).min(1),
    fps: z.number().int().min(1).max(120).default(30),
    width: z.number().int().min(1).max(3840).default(1920),
    height: z.number().int().min(1).max(2160).default(1080),
  })
  .refine(
    (data) => data.clips.every((clip) => clip.endTimeMs > clip.startTimeMs),
    { message: "Each clip's endTimeMs must be greater than startTimeMs" }
  );

export type Clip = z.infer<typeof ClipSchema>;
export type RenderRequest = z.infer<typeof RenderRequestSchema>;

export interface CompositionProps {
  clips: Clip[];
  fps: number;
}
