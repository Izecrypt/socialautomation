export interface NewsSummary {
  summary: string;
  key_angle: string;
  market_relevance: string;
  mentioned_assets: string[];
  mentioned_categories: string[];
  urgency: "low" | "medium" | "high";
  content_opportunities: string[];
}

export interface PlatformPostContent {
  hook: string;
  content_text: string;
  hashtags: string[];
  risk_score: "low" | "medium" | "high";
}

export interface GeneratedContentBundle {
  x: PlatformPostContent;
  telegram: PlatformPostContent;
  instagram: {
    caption: string;
    carousel_outline: string[];
    hashtags: string[];
    risk_score: "low" | "medium" | "high";
  };
  short_video: {
    title: string;
    hook: string;
    script: string;
    visual_suggestions: string[];
    caption: string;
    hashtags: string[];
    risk_score: "low" | "medium" | "high";
  };
  image_prompt: string;
  safety_notes: string[];
}

export interface RiskCheckResult {
  risk_score: "low" | "medium" | "high";
  issues: string[];
  safe_to_auto_post: boolean;
  suggested_revision: string;
}
