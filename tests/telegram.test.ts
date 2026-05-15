import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildSendMessagePayload,
  buildSendPhotoPayload,
} from "@/lib/telegram/client";

describe("Telegram payloads", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_CHANNEL_ID", "@testchannel");
  });

  it("builds sendMessage payload", () => {
    const payload = buildSendMessagePayload("Hello crypto");
    expect(payload.chat_id).toBe("@testchannel");
    expect(payload.text).toBe("Hello crypto");
  });

  it("builds sendPhoto payload", () => {
    const payload = buildSendPhotoPayload("https://example.com/img.png", "Caption");
    expect(payload.photo).toBe("https://example.com/img.png");
    expect(payload.caption).toBe("Caption");
  });
});
