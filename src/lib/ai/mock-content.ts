import type { GeneratedContentBundle, NewsSummary } from "./types";

export function mockNewsSummary(
  title: string,
  summary: string
): NewsSummary {
  return {
    summary: summary || title,
    key_angle: "Market-moving crypto news update",
    market_relevance: "Moderate — watch for narrative rotation",
    mentioned_assets: [],
    mentioned_categories: ["crypto"],
    urgency: "medium",
    content_opportunities: ["x", "telegram"],
  };
}

export function mockGeneratedContent(
  title: string,
  newsSummary: string
): GeneratedContentBundle {
  const hook = title.slice(0, 80);
  return {
    x: {
      hook,
      content_text: `${hook}\n\n${newsSummary.slice(0, 200)}\n\nNot financial advice. DYOR.`,
      hashtags: ["crypto", "bitcoin", "web3"],
      risk_score: "low",
    },
    telegram: {
      hook,
      content_text: `📰 ${title}\n\n${newsSummary}\n\n— Crypto Pulse (not financial advice)`,
      hashtags: ["crypto"],
      risk_score: "low",
    },
    instagram: {
      caption: `${title}\n\n${newsSummary}\n\n#crypto #blockchain`,
      carousel_outline: [
        "Slide 1: Hook headline",
        "Slide 2: What happened",
        "Slide 3: Why it matters",
        "Slide 4: Key takeaway",
      ],
      hashtags: ["crypto", "blockchain"],
      risk_score: "low",
    },
    short_video: {
      title: title.slice(0, 60),
      hook: hook.slice(0, 50),
      script: `Hook: ${hook}\n\nHere's what happened: ${newsSummary.slice(0, 150)}\n\nStay informed — not financial advice.`,
      visual_suggestions: ["News headline overlay", "Crypto chart B-roll (generic)"],
      caption: title,
      hashtags: ["crypto", "shorts"],
      risk_score: "medium",
    },
    image_prompt:
      "Create a clean futuristic crypto infographic in 4:5 format. Theme based on the news headline. Style: modern dark background, neon accents, professional, minimal text space. Do not include fake logos or misleading financial claims.",
    safety_notes: ["Mock content — configure OPENAI_API_KEY for AI generation"],
  };
}
