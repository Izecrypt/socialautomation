import Parser from "rss-parser";
import { prisma } from "@/lib/db";
import { ingestRssItem } from "@/lib/rss/ingest";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "CryptoRSSSocialBot/1.0" },
});

export async function fetchSourceFeed(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source || source.status !== "active") {
    return { fetched: 0, errors: ["Source not found or paused"] };
  }

  let feed;
  try {
    feed = await parser.parseURL(source.feedUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    await prisma.ingestLog.create({
      data: {
        sourceId,
        action: "rss_fetch",
        status: "error",
        message: msg,
      },
    });
    return { fetched: 0, errors: [msg] };
  }

  let count = 0;
  const errors: string[] = [];

  for (const item of feed.items.slice(0, 20)) {
    const link = item.link ?? item.guid;
    if (!link || !item.title) continue;

    try {
      await ingestRssItem({
        source_name: source.name,
        feed_url: source.feedUrl,
        title: item.title,
        summary: item.contentSnippet ?? item.content ?? "",
        article_url: link,
        published_at: item.pubDate ?? item.isoDate,
        raw_payload: item as Record<string, unknown>,
      });
      count++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Ingest error");
    }
  }

  await prisma.ingestLog.create({
    data: {
      sourceId,
      action: "rss_fetch",
      status: errors.length ? "partial" : "success",
      message: `Fetched ${count} items`,
      metadata: { count, errors },
    },
  });

  return { fetched: count, errors };
}

export async function fetchAllActiveSources() {
  const sources = await prisma.source.findMany({
    where: { status: "active" },
  });
  const results = [];
  for (const s of sources) {
    results.push({ sourceId: s.id, name: s.name, ...(await fetchSourceFeed(s.id)) });
  }
  return results;
}
