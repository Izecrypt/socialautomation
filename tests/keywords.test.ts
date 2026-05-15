import { describe, expect, it } from "vitest";
import { detectKeywords, hasCryptoAiKeyword, hasMajorToken } from "@/lib/keywords/detection";

describe("keyword detection", () => {
  it("detects AI crypto keywords", () => {
    const kws = detectKeywords(
      "Bittensor TAO surges on AI agent demand",
      "Decentralized compute narrative heats up"
    );
    expect(kws).toContain("bittensor");
    expect(kws).toContain("tao");
    expect(hasCryptoAiKeyword(kws)).toBe(true);
  });

  it("detects major tokens", () => {
    const kws = detectKeywords("Bitcoin ETF approval expected", "");
    expect(hasMajorToken(kws)).toBe(true);
  });
});
