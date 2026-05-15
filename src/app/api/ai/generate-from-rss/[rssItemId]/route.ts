import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { generateFromRssItem } from "@/lib/ai/generator";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ rssItemId: string }> }
) {
  const { rssItemId } = await params;

  try {
    const item = await prisma.rssItem.findUnique({ where: { id: rssItemId } });
    if (!item) return jsonError("RSS item not found", 404);

    const result = await generateFromRssItem(rssItemId);
    return jsonOk({
      rss_item_id: rssItemId,
      summary: result.summary,
      posts_created: result.posts.length,
      post_ids: result.posts.map((p) => p.id),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    await prisma.publishLog.create({
      data: {
        action: "ai_generate",
        status: "failed",
        message: msg,
      },
    });
    return jsonError(msg, 500);
  }
}
