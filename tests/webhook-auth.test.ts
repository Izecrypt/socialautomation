import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { validateWebhookSecret } from "@/lib/security/webhook";

describe("webhook auth", () => {
  it("validates secret header", () => {
    vi.stubEnv("MAKE_RSS_WEBHOOK_SECRET", "secret123");
    vi.stubEnv("NODE_ENV", "production");

    const req = new NextRequest("http://localhost/api/webhooks/rss-item", {
      headers: { "x-make-webhook-secret": "secret123" },
    });
    expect(validateWebhookSecret(req, "MAKE_RSS_WEBHOOK_SECRET")).toBe(true);

    const bad = new NextRequest("http://localhost/api/webhooks/rss-item", {
      headers: { "x-make-webhook-secret": "wrong" },
    });
    expect(validateWebhookSecret(bad, "MAKE_RSS_WEBHOOK_SECRET")).toBe(false);
  });
});
