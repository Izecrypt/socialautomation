import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api/response";
import { logMakeWebhook } from "@/lib/make/logger";
import { markPostFailed, markPostPosted } from "@/lib/queue/selector";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { validateWebhookSecret } from "@/lib/security/webhook";
import { platformResponseSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`platform-response:${ip}`);
  if (!rate.allowed) {
    return jsonError("Rate limit exceeded", 429);
  }

  if (!validateWebhookSecret(request, "MAKE_PUBLISH_WEBHOOK_SECRET")) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = platformResponseSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { generated_post_id, platform, status, external_id, message } =
    parsed.data;

  try {
    if (status === "posted") {
      await markPostPosted(generated_post_id, platform, external_id, message);
    } else {
      await markPostFailed(
        generated_post_id,
        platform,
        message ?? "Platform reported failure"
      );
    }

    await prisma.makeWebhookLog.create({
      data: {
        endpoint: "/api/webhooks/platform-response",
        method: "POST",
        statusCode: 200,
        requestBody: parsed.data as object,
        responseBody: { ok: true },
      },
    });

    await logMakeWebhook("/api/webhooks/platform-response", "POST", parsed.data, 200);
    return jsonOk({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 500);
  }
}
