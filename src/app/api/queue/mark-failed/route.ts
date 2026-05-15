import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { markPostFailed } from "@/lib/queue/selector";
import { validateWebhookSecret } from "@/lib/security/webhook";
import { markFailedSchema } from "@/lib/validation/schemas";

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

  const parsed = markFailedSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { generated_post_id, platform, error } = parsed.data;
  await markPostFailed(generated_post_id, platform, error);
  return jsonOk({ marked: true });
}
