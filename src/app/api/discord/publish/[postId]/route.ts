import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api/response";
import { isDiscordConfigured, publishPostToDiscord } from "@/lib/discord/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  if (!isDiscordConfigured()) {
    return jsonError(
      "Discord not configured. Set DISCORD_WEBHOOK_URL in .env",
      503
    );
  }

  const post = await prisma.generatedPost.findUnique({
    where: { id: postId },
    include: { rssItem: true },
  });

  if (!post) return jsonError("Post not found", 404);
  if (post.riskScore === "high") {
    return jsonError("High-risk posts cannot be auto-published", 403);
  }

  const result = await publishPostToDiscord({
    content: post.contentText,
    hook: post.hook,
    platform: post.platform,
    sourceTitle: post.rssItem.title,
    articleUrl: post.rssItem.articleUrl,
  });

  if (!result.ok) {
    await prisma.publishLog.create({
      data: {
        generatedPostId: postId,
        platform: post.platform,
        action: "discord_publish",
        status: "failed",
        message: result.error,
      },
    });
    return jsonError(result.error ?? "Discord send failed", 502);
  }

  await prisma.publishLog.create({
    data: {
      generatedPostId: postId,
      platform: post.platform,
      action: "discord_publish",
      status: "success",
      message: "Sent to Discord webhook",
    },
  });

  return jsonOk({ sent: true });
}
