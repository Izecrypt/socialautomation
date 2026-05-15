import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { markPostPosted } from "@/lib/queue/selector";
import { validateWebhookSecret } from "@/lib/security/webhook";
import { markPostedSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request, "MAKE_PUBLISH_WEBHOOK_SECRET")) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = markPostedSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { generated_post_id, platform, external_id, message } = parsed.data;
  await markPostPosted(generated_post_id, platform, external_id, message);
  return jsonOk({ marked: true });
}
