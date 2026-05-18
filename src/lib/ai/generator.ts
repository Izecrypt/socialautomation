import { prisma } from "@/lib/db";
import { getAIProvider, hasAIConfigured } from "@/lib/ai/provider";
import {
  fillTemplate,
  PLATFORM_CONTENT_PROMPT,
  RSS_SUMMARIZER_PROMPT,
} from "@/lib/ai/prompts";
import { mockGeneratedContent, mockNewsSummary } from "@/lib/ai/mock-content";
import type {
  GeneratedContentBundle,
  NewsSummary,
  RiskCheckResult,
} from "@/lib/ai/types";
import { RISK_FILTER_PROMPT } from "@/lib/ai/prompts";
import type { RiskLevel } from "@/generated/prisma/client";
import { getSchedulingSettings } from "@/lib/scheduling/settings";
import {
  generateImagesForRssPosts,
  generateImageForPost,
  isImageGenerationEnabled,
  shouldGenerateOnApprove,
} from "@/lib/ai/images";

function mapRisk(r: string): RiskLevel {
  if (r === "high") return "high";
  if (r === "medium") return "medium";
  return "low";
}

async function getBrandVoiceText(): Promise<string> {
  const brand = await prisma.brandVoiceSetting.findFirst();
  if (!brand) {
    return "Tone: crypto-native, punchy, clear, fast, news-reactive. No financial advice. No fake certainty.";
  }
  return `Brand: ${brand.brandName}. Tone: ${brand.tone}. Style: ${brand.postingStyle}. Forbidden: ${brand.forbiddenWords.join(", ")}. Preferred: ${brand.preferredPhrases.join(", ")}.`;
}

export async function summarizeRssItem(rssItemId: string): Promise<NewsSummary> {
  const item = await prisma.rssItem.findUniqueOrThrow({ where: { id: rssItemId } });
  const ai = getAIProvider();

  const prompt = fillTemplate(RSS_SUMMARIZER_PROMPT, {
    title: item.title,
    summary: item.summary,
    source_name: item.sourceName,
    article_url: item.articleUrl,
    detected_keywords: item.detectedKeywords.join(", "),
  });

  if (hasAIConfigured()) {
    const result = await ai.completeJson<NewsSummary>(prompt);
    if (result) return result;
  }

  return mockNewsSummary(item.title, item.summary);
}

export async function generateFromRssItem(rssItemId: string) {
  const item = await prisma.rssItem.findUniqueOrThrow({
    where: { id: rssItemId },
  });

  const summary = await summarizeRssItem(rssItemId);
  const brandVoice = await getBrandVoiceText();
  const ai = getAIProvider();

  const newsBlock = JSON.stringify({
    title: item.title,
    summary: item.summary,
    source: item.sourceName,
    url: item.articleUrl,
    analysis: summary,
    keywords: item.detectedKeywords,
  });

  let bundle: GeneratedContentBundle;

  if (hasAIConfigured()) {
    const prompt = fillTemplate(PLATFORM_CONTENT_PROMPT, {
      brand_voice: brandVoice,
      news_summary: newsBlock,
    });
    const result = await ai.completeJson<GeneratedContentBundle>(prompt);
    bundle = result ?? mockGeneratedContent(item.title, summary.summary);
  } else {
    bundle = mockGeneratedContent(item.title, summary.summary);
  }

  const settings = await getSchedulingSettings();
  const posts = [];

  const xPost = await prisma.generatedPost.create({
    data: {
      rssItemId,
      platform: "x",
      contentType: "post",
      contentText: bundle.x.content_text,
      hook: bundle.x.hook,
      hashtags: bundle.x.hashtags,
      imagePrompt: bundle.image_prompt,
      riskScore: mapRisk(bundle.x.risk_score),
      safetyNotes: bundle.safety_notes,
      status: resolveInitialStatus(bundle.x.risk_score, settings),
    },
  });
  posts.push(xPost);

  const tgPost = await prisma.generatedPost.create({
    data: {
      rssItemId,
      platform: "telegram",
      contentType: "message",
      contentText: bundle.telegram.content_text,
      hook: bundle.telegram.hook,
      hashtags: bundle.telegram.hashtags,
      imagePrompt: bundle.image_prompt,
      riskScore: mapRisk(bundle.telegram.risk_score),
      safetyNotes: bundle.safety_notes,
      status: resolveInitialStatus(bundle.telegram.risk_score, settings),
    },
  });
  posts.push(tgPost);

  const igPost = await prisma.generatedPost.create({
    data: {
      rssItemId,
      platform: "instagram",
      contentType: "carousel",
      contentText: bundle.instagram.caption,
      hook: bundle.instagram.carousel_outline[0] ?? "",
      hashtags: bundle.instagram.hashtags,
      imagePrompt: bundle.image_prompt,
      riskScore: mapRisk(bundle.instagram.risk_score),
      safetyNotes: bundle.safety_notes,
      metadata: { carousel_outline: bundle.instagram.carousel_outline },
      status: resolveInitialStatus(bundle.instagram.risk_score, settings),
    },
  });
  posts.push(igPost);

  const videoPost = await prisma.generatedPost.create({
    data: {
      rssItemId,
      platform: "tiktok",
      contentType: "short_video",
      contentText: bundle.short_video.script,
      hook: bundle.short_video.hook,
      hashtags: bundle.short_video.hashtags,
      imagePrompt: bundle.image_prompt,
      riskScore: mapRisk(bundle.short_video.risk_score),
      safetyNotes: bundle.safety_notes,
      metadata: {
        title: bundle.short_video.title,
        visual_suggestions: bundle.short_video.visual_suggestions,
        caption: bundle.short_video.caption,
      },
      status: resolveInitialStatus(bundle.short_video.risk_score, settings),
    },
  });
  posts.push(videoPost);

  const ytPost = await prisma.generatedPost.create({
    data: {
      rssItemId,
      platform: "youtube_shorts",
      contentType: "short_video",
      contentText: bundle.short_video.script,
      hook: bundle.short_video.hook,
      hashtags: bundle.short_video.hashtags,
      imagePrompt: bundle.image_prompt,
      riskScore: mapRisk(bundle.short_video.risk_score),
      safetyNotes: bundle.safety_notes,
      metadata: {
        title: bundle.short_video.title,
        visual_suggestions: bundle.short_video.visual_suggestions,
        caption: bundle.short_video.caption,
        platform_note: "YouTube Shorts — vertical 9:16, hook in first 3 seconds",
      },
      status: resolveInitialStatus(bundle.short_video.risk_score, settings),
    },
  });
  posts.push(ytPost);

  await prisma.mediaAsset.create({
    data: {
      generatedPostId: xPost.id,
      assetType: "image",
      prompt: bundle.image_prompt,
      status: process.env.OPENAI_API_KEY ? "prompt_ready" : "placeholder",
    },
  });

  await prisma.rssItem.update({
    where: { id: rssItemId },
    data: { status: "generated" },
  });

  await prisma.publishLog.create({
    data: {
      generatedPostId: xPost.id,
      platform: "x",
      action: "ai_generate",
      status: "success",
      message: hasAIConfigured() ? "AI generation complete" : "Mock generation (no API key)",
    },
  });

  if (isImageGenerationEnabled() && !shouldGenerateOnApprove()) {
    await generateImagesForRssPosts(posts.map((p) => p.id));
  }

  return { summary, posts, bundle };
}

export { generateImageForPost };

function resolveInitialStatus(
  risk: string,
  settings: { approvalRequired: boolean; autoPostRiskLevel: RiskLevel }
): "approved" | "needs_review" | "draft" {
  if (risk === "high") return "needs_review";
  if (risk === "medium") return settings.approvalRequired ? "needs_review" : "approved";
  if (risk === "low" && !settings.approvalRequired) return "approved";
  return "needs_review";
}

export async function runRiskCheck(generatedPostId: string): Promise<RiskCheckResult> {
  const post = await prisma.generatedPost.findUniqueOrThrow({
    where: { id: generatedPostId },
  });

  const ai = getAIProvider();
  const prompt = fillTemplate(RISK_FILTER_PROMPT, {
    content_text: post.contentText,
  });

  let result: RiskCheckResult;

  if (hasAIConfigured()) {
    const parsed = await ai.completeJson<RiskCheckResult>(prompt);
    result =
      parsed ??
      heuristicRiskCheck(post.contentText);
  } else {
    result = heuristicRiskCheck(post.contentText);
  }

  const notes = [...post.safetyNotes, ...result.issues];
  let status = post.status;
  if (result.risk_score === "high") {
    status = "needs_review";
  } else if (result.risk_score === "medium") {
    status = "needs_review";
  } else if (result.safe_to_auto_post) {
    const settings = await getSchedulingSettings();
    if (!settings.approvalRequired) status = "approved";
  }

  await prisma.generatedPost.update({
    where: { id: generatedPostId },
    data: {
      riskScore: mapRisk(result.risk_score),
      safetyNotes: notes,
      status,
      metadata: {
        ...(typeof post.metadata === "object" && post.metadata !== null
          ? post.metadata
          : {}),
        risk_check: result as object,
        suggested_revision: result.suggested_revision,
      },
    },
  });

  return result;
}

function heuristicRiskCheck(text: string): RiskCheckResult {
  const lower = text.toLowerCase();
  const issues: string[] = [];
  const riskyPatterns = [
    { pattern: "guaranteed", issue: "guaranteed profit" },
    { pattern: "buy now", issue: "direct buy instruction" },
    { pattern: "sell now", issue: "direct sell instruction" },
    { pattern: "100x", issue: "misleading claim" },
    { pattern: "financial advice", issue: "financial advice" },
    { pattern: "leverage", issue: "leverage encouragement" },
    { pattern: "pump", issue: "pump language" },
  ];

  for (const { pattern, issue } of riskyPatterns) {
    if (lower.includes(pattern)) issues.push(issue);
  }

  const risk_score =
    issues.length >= 2 ? "high" : issues.length === 1 ? "medium" : "low";

  return {
    risk_score,
    issues,
    safe_to_auto_post: risk_score === "low",
    suggested_revision: issues.length
      ? "Remove promotional language and avoid direct trade instructions."
      : "",
  };
}

