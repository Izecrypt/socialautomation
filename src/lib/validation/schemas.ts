import { z } from "zod";

export const rssItemWebhookSchema = z.object({
  source_name: z.string().min(1),
  feed_url: z.string().url(),
  title: z.string().min(1),
  summary: z.string().optional().default(""),
  article_url: z.string().url(),
  published_at: z.string().optional(),
  raw_payload: z.record(z.string(), z.unknown()).optional().default({}),
});

export const platformResponseSchema = z.object({
  generated_post_id: z.string().uuid(),
  platform: z.enum(["x", "telegram", "instagram", "tiktok", "youtube_shorts"]),
  status: z.enum(["posted", "failed"]),
  external_id: z.string().optional(),
  message: z.string().optional(),
  raw_response: z.record(z.string(), z.unknown()).optional(),
});

export const markPostedSchema = z.object({
  generated_post_id: z.string().uuid(),
  platform: z.enum(["x", "telegram", "instagram", "tiktok", "youtube_shorts"]),
  external_id: z.string().optional(),
  message: z.string().optional(),
});

export const markFailedSchema = z.object({
  generated_post_id: z.string().uuid(),
  platform: z.enum(["x", "telegram", "instagram", "tiktok", "youtube_shorts"]),
  error: z.string().min(1),
});

export const sourceFormSchema = z.object({
  name: z.string().min(1),
  feedUrl: z.string().url(),
  category: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  checkFrequency: z.enum(["mins_5", "mins_15", "mins_30", "mins_60"]),
  keywords: z.array(z.string()).default([]),
  excludedKeywords: z.array(z.string()).default([]),
  status: z.enum(["active", "paused"]).default("active"),
});

export const generatedPostUpdateSchema = z.object({
  contentText: z.string().min(1).optional(),
  hook: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  imagePrompt: z.string().optional(),
  status: z
    .enum(["draft", "needs_review", "approved", "scheduled", "posted", "failed", "rejected"])
    .optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export type RssItemWebhookInput = z.infer<typeof rssItemWebhookSchema>;
