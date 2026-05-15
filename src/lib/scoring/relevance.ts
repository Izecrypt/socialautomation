import {
  BREAKING_WORDS,
  HACK_WORDS,
  MARKET_IMPACT_WORDS,
  REGULATION_WORDS,
} from "@/lib/constants/keywords";
import { hasCryptoAiKeyword, hasMajorToken } from "@/lib/keywords/detection";
import type { SourcePriority } from "@/generated/prisma/client";

export interface ScoringInput {
  title: string;
  summary: string;
  detectedKeywords: string[];
  sourcePriority: SourcePriority;
  publishedAt?: Date | null;
  isTitleDuplicate?: boolean;
}

function textContainsAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

export function calculateRelevanceScore(input: ScoringInput): number {
  const text = `${input.title} ${input.summary}`;
  let score = 0;

  if (hasCryptoAiKeyword(input.detectedKeywords)) score += 5;
  if (hasMajorToken(input.detectedKeywords)) score += 3;
  if (input.sourcePriority === "high") score += 3;
  if (input.sourcePriority === "low") score -= 2;
  if (textContainsAny(text, BREAKING_WORDS)) score += 3;
  if (textContainsAny(text, MARKET_IMPACT_WORDS)) score += 4;
  if (textContainsAny(text, REGULATION_WORDS)) score += 4;
  if (textContainsAny(text, HACK_WORDS)) score += 4;
  if (input.isTitleDuplicate) score -= 10;

  if (input.publishedAt) {
    const ageHours =
      (Date.now() - input.publishedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > 48) score -= 5;
  }

  return score;
}

export type RelevanceDecision = "queue" | "watchlist" | "ignore";

export function relevanceDecision(score: number): RelevanceDecision {
  if (score >= 8) return "queue";
  if (score >= 5) return "watchlist";
  return "ignore";
}

export function statusFromDecision(
  decision: RelevanceDecision,
  isDuplicate: boolean
): "queued" | "new" | "ignored" | "duplicate" {
  if (isDuplicate) return "duplicate";
  if (decision === "queue") return "queued";
  if (decision === "watchlist") return "new";
  return "ignored";
}
