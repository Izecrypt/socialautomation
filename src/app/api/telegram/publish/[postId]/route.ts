import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api/response";
import { markPostFailed, markPostPosted } from "@/lib/queue/selector";
import {
  isTelegramConfigured,
  sendTelegramMessage,
  sendTelegramPhoto,
} from "@/lib/telegram/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  if (!isTelegramConfigured()) {
    return jsonError("Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID.", 503);
  }

  const post = await prisma.generatedPost.findUnique({
    where: { id: postId },
    include: { rssItem: true },
  });

  if (!post) return jsonError("Post not found", 404);
  if (post.platform !== "telegram") {
    return jsonError("Post is not a Telegram post", 400);
  }
  if (post.riskScore === "high") {
    return jsonError("High-risk posts cannot be auto-published", 403);
  }

  const text = post.contentText;
  let result;

  if (post.mediaUrl) {
    result = await sendTelegramPhoto(post.mediaUrl, text);
  } else {
    result = await sendTelegramMessage(text);
  }

  if (!result.ok) {
    await markPostFailed(postId, "telegram", result.error ?? "Unknown error");
    return jsonError(result.error ?? "Telegram send failed", 502);
  }

  await markPostPosted(
    postId,
    "telegram",
    result.messageId?.toString(),
    "Published via Telegram API"
  );

  return jsonOk({ message_id: result.messageId });
}
