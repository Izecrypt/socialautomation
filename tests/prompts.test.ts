import { describe, expect, it } from "vitest";
import { fillTemplate, RSS_SUMMARIZER_PROMPT } from "@/lib/ai/prompts";

describe("AI prompts", () => {
  it("fills template variables", () => {
    const prompt = fillTemplate(RSS_SUMMARIZER_PROMPT, {
      title: "Test",
      summary: "Summary",
      source_name: "CoinDesk",
      article_url: "https://example.com",
      detected_keywords: "btc",
    });
    expect(prompt).toContain("Test");
    expect(prompt).not.toContain("{{title}}");
  });
});
