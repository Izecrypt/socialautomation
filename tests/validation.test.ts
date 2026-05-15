import { describe, expect, it } from "vitest";
import { rssItemWebhookSchema } from "@/lib/validation/schemas";

describe("RSS webhook validation", () => {
  it("accepts valid payload", () => {
    const result = rssItemWebhookSchema.safeParse({
      source_name: "CoinDesk",
      feed_url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
      title: "Bitcoin rises",
      summary: "Markets up",
      article_url: "https://www.coindesk.com/article/1",
      published_at: "2026-05-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = rssItemWebhookSchema.safeParse({ title: "x" });
    expect(result.success).toBe(false);
  });
});
