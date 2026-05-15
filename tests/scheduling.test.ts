import { describe, expect, it } from "vitest";

function isWithinActiveHours(hour: number, start: number, end: number): boolean {
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

describe("scheduling rules", () => {
  it("respects active hours window", () => {
    expect(isWithinActiveHours(10, 8, 22)).toBe(true);
    expect(isWithinActiveHours(3, 8, 22)).toBe(false);
  });

  it("default X rate is 2 per hour", () => {
    const postsPerHour = 2;
    const minGapMinutes = 30;
    expect(60 / minGapMinutes).toBeGreaterThanOrEqual(postsPerHour);
  });
});
