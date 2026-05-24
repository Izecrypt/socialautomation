import { describe, expect, it } from "vitest";
import { buildScenes } from "@/lib/ai/scenes";

describe("buildScenes", () => {
  it("creates one scene per visual suggestion when provided", () => {
    const scenes = buildScenes({
      hook: "Big move in crypto AI",
      script:
        "Bitcoin pumps 5%. Tao token rallies. AI agents are eating DeFi. Watch DePIN closely.",
      visualSuggestions: [
        "Headline overlay",
        "Token chart B-roll",
        "Robot trading agent montage",
        "DePIN network animation",
      ],
      basePrompt: "Neon dark crypto vibe",
    });

    expect(scenes.length).toBeGreaterThanOrEqual(3);
    expect(scenes.length).toBeLessThanOrEqual(6);
    expect(scenes[0].narration.length).toBeGreaterThan(0);
    expect(scenes[0].imagePrompt).toMatch(/neon|crypto/i);
  });

  it("falls back to sentence splitting when no visual suggestions", () => {
    const scenes = buildScenes({
      hook: "Hook line",
      script:
        "First sentence. Second sentence here. Third one. Fourth wraps it up.",
      visualSuggestions: [],
    });
    expect(scenes.length).toBeGreaterThanOrEqual(3);
    expect(scenes[0].caption).toBeTruthy();
  });

  it("uses hook as first caption when available", () => {
    const scenes = buildScenes({
      hook: "AI agents flip the script",
      script: "Some narration about the news event.",
      visualSuggestions: ["Visual one"],
    });
    expect(scenes[0].caption).toContain("AI");
  });

  it("truncates long captions", () => {
    const scenes = buildScenes({
      hook: null,
      script:
        "This is an unusually long sentence that should never make it into a caption verbatim because we cap caption length for readability on vertical video formats.",
      visualSuggestions: [],
    });
    for (const s of scenes) {
      expect(s.caption.length).toBeLessThanOrEqual(60);
    }
  });

  it("strips outline markers from visual suggestions", () => {
    const scenes = buildScenes({
      hook: "Hook",
      script: "Body content. Second sentence.",
      visualSuggestions: ["1. Slide one heading", "- Slide two stuff"],
    });
    expect(scenes[0].imagePrompt).not.toMatch(/^\s*1\./);
    expect(scenes[0].imagePrompt).not.toMatch(/^\s*-/);
  });
});
