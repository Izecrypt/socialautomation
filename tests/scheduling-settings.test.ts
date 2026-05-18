import { describe, expect, it } from "vitest";
import {
  getDefaultScheduling,
  minGapFromPostsPerHour,
} from "@/lib/scheduling/defaults";

describe("scheduling settings", () => {
  it("derives min gap from posts per hour", () => {
    expect(minGapFromPostsPerHour(2)).toBe(30);
    expect(minGapFromPostsPerHour(3)).toBe(20);
  });

  it("defaults include all five platforms", () => {
    const d = getDefaultScheduling();
    expect(d.platforms.x.postsPerHour).toBe(2);
    expect(d.platforms.instagram.postsPerDay).toBe(1);
    expect(d.platforms.tiktok.everyNDays).toBe(2);
    expect(d.platforms.youtube_shorts.everyNDays).toBe(2);
    expect(d.nicheMode).toBe("all");
  });
});
