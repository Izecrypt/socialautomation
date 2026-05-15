import { NextRequest } from "next/server";

export function validateWebhookSecret(
  request: NextRequest,
  envKey: "MAKE_RSS_WEBHOOK_SECRET" | "MAKE_PUBLISH_WEBHOOK_SECRET"
): boolean {
  const secret = process.env[envKey];
  if (!secret) {
    // Allow in development without secret
    return process.env.NODE_ENV === "development";
  }
  const header =
    request.headers.get("x-make-webhook-secret") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret;
}
