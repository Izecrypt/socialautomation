import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { selectNextPost } from "@/lib/queue/selector";
import { validateWebhookSecret } from "@/lib/security/webhook";
import type { Platform } from "@/generated/prisma/client";
import { z } from "zod";

const platformSchema = z.enum([
  "x",
  "telegram",
  "instagram",
  "tiktok",
  "youtube_shorts",
]);

export async function GET(request: NextRequest) {
  if (!validateWebhookSecret(request, "MAKE_PUBLISH_WEBHOOK_SECRET")) {
    return jsonError("Unauthorized", 401);
  }

  const platformParam = request.nextUrl.searchParams.get("platform");
  const parsed = platformSchema.safeParse(platformParam);
  if (!parsed.success) {
    return jsonError("Invalid platform. Use: x, telegram, instagram, tiktok, youtube_shorts", 400);
  }

  const platform = parsed.data as Platform;
  const post = await selectNextPost(platform);

  if (!post) {
    return jsonOk({ post: null, message: "No eligible post in queue" });
  }

  return jsonOk({
    post: {
      id: post.id,
      platform: post.platform,
      content_text: post.contentText,
      hook: post.hook,
      hashtags: post.hashtags,
      image_prompt: post.imagePrompt,
      media_url: post.mediaUrl,
      risk_score: post.riskScore,
      rss_item: {
        id: post.rssItem.id,
        title: post.rssItem.title,
        article_url: post.rssItem.articleUrl,
        source_name: post.rssItem.sourceName,
      },
    },
  });
}
