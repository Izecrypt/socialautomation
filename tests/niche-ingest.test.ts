import { describe, expect, it } from "vitest";
import { relevanceDecision, statusFromDecision } from "@/lib/scoring/relevance";
import { hasCryptoAiKeyword } from "@/lib/keywords/detection";

describe("crypto AI niche filtering logic", () => {
  it("detects AI niche keywords", () => {
    expect(hasCryptoAiKeyword(["bittensor", "btc"])).toBe(true);
    expect(hasCryptoAiKeyword(["bitcoin", "etf"])).toBe(false);
  });

  it("downgrades queue to watchlist when niche filter applied", () => {
    const score = 10;
    expect(relevanceDecision(score)).toBe("queue");
    const decision = "watchlist";
    expect(statusFromDecision(decision, false)).toBe("new");
  });
});
