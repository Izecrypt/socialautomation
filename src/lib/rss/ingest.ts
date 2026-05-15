import { prisma } from "@/lib/db";
import { checkDuplicates } from "@/lib/deduplication";
import { detectKeywords } from "@/lib/keywords/detection";
import {
  calculateRelevanceScore,
  relevanceDecision,
  statusFromDecision,
} from "@/lib/scoring/relevance";
import type { RssItemWebhookInput } from "@/lib/validation/schemas";
import type { SourcePriority } from "@/generated/prisma/client";

export interface IngestResult {
  id: string;
  status: string;
  relevanceScore: number;
  detectedKeywords: string[];
  isDuplicate: boolean;
  message: string;
}

export async function ingestRssItem(
  input: RssItemWebhookInput
): Promise<IngestResult> {
  const dupCheck = await checkDuplicates(input.article_url, input.title);
  if (dupCheck.isDuplicate && dupCheck.reason === "url") {
    const existing = await prisma.rssItem.findUnique({
      where: { articleUrl: input.article_url },
    });
    return {
      id: existing!.id,
      status: "duplicate",
      relevanceScore: existing!.relevanceScore,
      detectedKeywords: existing!.detectedKeywords,
      isDuplicate: true,
      message: "Duplicate article URL",
    };
  }

  const source = await prisma.source.findFirst({
    where: {
      OR: [{ name: input.source_name }, { feedUrl: input.feed_url }],
    },
  });

  const sourceKeywords = source?.keywords ?? [];
  const excluded = source?.excludedKeywords ?? [];
  const detectedKeywords = detectKeywords(input.title, input.summary ?? "");
  const mergedKeywords = Array.from(
    new Set([...detectedKeywords, ...sourceKeywords])
  );

  const text = `${input.title} ${input.summary ?? ""}`.toLowerCase();
  const hasExcluded = excluded.some((ex) => text.includes(ex.toLowerCase()));

  const isDuplicate = dupCheck.isDuplicate;
  const sourcePriority: SourcePriority = source?.priority ?? "medium";

  const publishedAt = input.published_at
    ? new Date(input.published_at)
    : null;

  const relevanceScore = hasExcluded
    ? 0
    : calculateRelevanceScore({
        title: input.title,
        summary: input.summary ?? "",
        detectedKeywords: mergedKeywords,
        sourcePriority,
        publishedAt,
        isTitleDuplicate: dupCheck.reason === "title",
      });

  const decision = hasExcluded ? "ignore" : relevanceDecision(relevanceScore);
  const status = statusFromDecision(decision, isDuplicate);

  const item = await prisma.rssItem.create({
    data: {
      sourceId: source?.id,
      sourceName: input.source_name,
      feedUrl: input.feed_url,
      title: input.title,
      summary: input.summary ?? "",
      articleUrl: input.article_url,
      publishedAt,
      rawPayload: input.raw_payload as object,
      relevanceScore,
      detectedKeywords: mergedKeywords,
      isDuplicate,
      status,
    },
  });

  await prisma.ingestLog.create({
    data: {
      sourceId: source?.id,
      action: "webhook_ingest",
      status: "success",
      message: `Ingested: ${status}`,
      metadata: { relevanceScore, detectedKeywords: mergedKeywords },
    },
  });

  return {
    id: item.id,
    status: item.status,
    relevanceScore: item.relevanceScore,
    detectedKeywords: item.detectedKeywords,
    isDuplicate: item.isDuplicate,
    message: `RSS item saved as ${status}`,
  };
}
