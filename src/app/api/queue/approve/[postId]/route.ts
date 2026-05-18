import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api/response";
import { validateWebhookSecret } from "@/lib/security/webhook";
import {
  generateImageForPost,
  isImageGenerationEnabled,
  shouldGenerateOnApprove,
} from "@/lib/ai/images";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  if (!validateWebhookSecret(request, "MAKE_PUBLISH_WEBHOOK_SECRET")) {
    return jsonError("Unauthorized", 401);
  }

  const { postId } = await params;

  const post = await prisma.generatedPost.findUnique({
    where: { id: postId },
  });

  if (!post) return jsonError("Post not found", 404);
  if (post.riskScore === "high") {
    return jsonError("High-risk posts cannot be auto-approved", 403);
  }
  if (post.status === "posted" || post.status === "rejected") {
    return jsonError(`Post is already ${post.status}`, 400);
  }

  const updated = await prisma.generatedPost.update({
    where: { id: postId },
    data: { status: "approved" },
  });

  if (
    isImageGenerationEnabled() &&
    shouldGenerateOnApprove() &&
    ["x", "telegram", "instagram"].includes(updated.platform)
  ) {
    await generateImageForPost(postId);
  }

  await prisma.publishLog.create({
    data: {
      generatedPostId: postId,
      platform: updated.platform,
      action: "approve",
      status: "success",
      message: "Approved via API",
    },
  });

  const refreshed = await prisma.generatedPost.findUnique({
    where: { id: postId },
    select: { id: true, status: true, platform: true, mediaUrl: true },
  });

  return jsonOk({ post: refreshed });
}
