import { describe, expect, it } from "vitest";
import {
  calculateRelevanceScore,
  relevanceDecision,
  statusFromDecision,
} from "@/lib/scoring/relevance";

describe("relevance scoring", () => {
  it("queues high-score breaking AI news", () => {
    const score = calculateRelevanceScore({
      title: "BREAKING: Bittensor TAO AI agents surge",
      summary: "Market impact on decentralized compute",
      detectedKeywords: ["bittensor", "tao", "ai"],
      sourcePriority: "high",
      publishedAt: new Date(),
    });
    expect(score).toBeGreaterThanOrEqual(8);
    expect(relevanceDecision(score)).toBe("queue");
  });

  it("ignores low relevance", () => {
    const score = calculateRelevanceScore({
      title: "Random article",
      summary: "Nothing crypto",
      detectedKeywords: [],
      sourcePriority: "low",
    });
    expect(relevanceDecision(score)).toBe("ignore");
  });

  it("maps status from decision", () => {
    expect(statusFromDecision("queue", false)).toBe("queued");
    expect(statusFromDecision("ignore", true)).toBe("duplicate");
  });
});
