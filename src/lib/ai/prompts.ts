export const RSS_SUMMARIZER_PROMPT = `You are a crypto news analyst.

Analyze the following RSS news item.

Only use the information provided.
Do not invent facts.
Do not add unsupported claims.

Return JSON:
{
  "summary": "",
  "key_angle": "",
  "market_relevance": "",
  "mentioned_assets": [],
  "mentioned_categories": [],
  "urgency": "low|medium|high",
  "content_opportunities": []
}

RSS item:
Title: {{title}}
Summary: {{summary}}
Source: {{source_name}}
URL: {{article_url}}
Keywords: {{detected_keywords}}`;

export const PLATFORM_CONTENT_PROMPT = `You are creating content for a crypto news/opinion social media brand.

The content must be based only on the provided RSS news item and summary.

Do not invent facts.
Do not give financial advice.
Do not use guaranteed profit language.
Do not impersonate any influencer.
Use an original punchy crypto-native style.

Brand voice:
{{brand_voice}}

Generate content for:
- X/Twitter
- Telegram
- Instagram caption
- Instagram carousel outline
- TikTok/YouTube Shorts script
- image prompt

Return valid JSON:
{
  "x": {
    "hook": "",
    "content_text": "",
    "hashtags": [],
    "risk_score": "low|medium|high"
  },
  "telegram": {
    "hook": "",
    "content_text": "",
    "hashtags": [],
    "risk_score": "low|medium|high"
  },
  "instagram": {
    "caption": "",
    "carousel_outline": [],
    "hashtags": [],
    "risk_score": "low|medium|high"
  },
  "short_video": {
    "title": "",
    "hook": "",
    "script": "",
    "visual_suggestions": [],
    "caption": "",
    "hashtags": [],
    "risk_score": "low|medium|high"
  },
  "image_prompt": "",
  "safety_notes": []
}

News:
{{news_summary}}`;

export const RISK_FILTER_PROMPT = `Review this crypto social media post.

Classify the risk as low, medium, or high.

Flag issues:
- financial advice
- guaranteed profit
- direct buy/sell instruction
- leverage/futures encouragement
- unverified rumor
- fake urgency
- pump-and-dump language
- misleading claim
- unsupported fact
- fake price prediction

Return JSON:
{
  "risk_score": "low|medium|high",
  "issues": [],
  "safe_to_auto_post": true|false,
  "suggested_revision": ""
}

Post:
{{content_text}}`;

export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}
