import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildDiscordPayload } from "@/lib/discord/client";

describe("Discord payloads", () => {
  beforeEach(() => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/test/token");
  });

  it("builds message with platform and source link", () => {
    const payload = buildDiscordPayload({
      content: "Main post body",
      hook: "Breaking news",
      platform: "x",
      sourceTitle: "Example headline",
      articleUrl: "https://example.com/article",
    });
    expect(payload.content).toContain("[X]");
    expect(payload.content).toContain("Breaking news");
    expect(payload.content).toContain("https://example.com/article");
  });

  it("appends mediaUrl when includeMediaUrl is true", () => {
    const payload = buildDiscordPayload({
      content: "Body",
      platform: "tiktok",
      mediaUrl: "https://example.com/media/videos/abc.mp4",
      includeMediaUrl: true,
    });
    expect(payload.content).toContain("https://example.com/media/videos/abc.mp4");
  });

  it("omits mediaUrl when includeMediaUrl is false", () => {
    const payload = buildDiscordPayload({
      content: "Body",
      platform: "tiktok",
      mediaUrl: "https://example.com/media/videos/abc.mp4",
      includeMediaUrl: false,
    });
    expect(payload.content).not.toContain("abc.mp4");
  });
});
