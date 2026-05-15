import { describe, expect, it } from "vitest";
import { normalizeTitle, titleSimilarity } from "@/lib/utils";

describe("title deduplication", () => {
  it("normalizes titles", () => {
    expect(normalizeTitle("Bitcoin Hits $100K!!!")).toBe("bitcoin hits 100k");
  });

  it("detects similar titles", () => {
    const a = "Bitcoin ETF approved by SEC regulators today";
    const b = "Bitcoin ETF approved by SEC regulators";
    expect(titleSimilarity(a, b)).toBeGreaterThan(0.85);
  });

  it("treats different titles as distinct", () => {
    expect(titleSimilarity("Ethereum upgrade", "Solana hack")).toBeLessThan(0.5);
  });
});
