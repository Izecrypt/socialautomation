import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { validateWebhookSecret } from "@/lib/security/webhook";
import { generateVideoForPost } from "@/lib/ai/video";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  if (!validateWebhookSecret(request, "MAKE_PUBLISH_WEBHOOK_SECRET")) {
    return jsonError("Unauthorized", 401);
  }

  const { postId } = await params;
  const result = await generateVideoForPost(postId);
  if (!result.ok) return jsonError(result.error, 500);
  return jsonOk({ media_url: result.url });
}
