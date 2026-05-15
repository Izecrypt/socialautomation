import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { ingestRssItem } from "@/lib/rss/ingest";
import { logMakeWebhook } from "@/lib/make/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { validateWebhookSecret } from "@/lib/security/webhook";
import { rssItemWebhookSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`rss-webhook:${ip}`);
  if (!rate.allowed) {
    return jsonError("Rate limit exceeded", 429, { retryAfter: rate.retryAfter });
  }

  if (!validateWebhookSecret(request, "MAKE_RSS_WEBHOOK_SECRET")) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = rssItemWebhookSchema.safeParse(body);
  if (!parsed.success) {
    await logMakeWebhook("/api/webhooks/rss-item", "POST", body, 400, parsed.error.flatten());
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const result = await ingestRssItem(parsed.data);
    const response = { ...result };
    await logMakeWebhook("/api/webhooks/rss-item", "POST", parsed.data, 200, response);
    return jsonOk(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ingest failed";
    await logMakeWebhook("/api/webhooks/rss-item", "POST", body, 500, undefined, msg);
    return jsonError(msg, 500);
  }
}
