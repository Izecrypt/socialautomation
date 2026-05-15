import { prisma } from "@/lib/db";
import { titleSimilarity } from "@/lib/utils";
import { subHours } from "date-fns";

const TITLE_SIMILARITY_THRESHOLD = 0.85;
const LOOKBACK_HOURS = 24;

export async function findDuplicateByUrl(articleUrl: string) {
  return prisma.rssItem.findUnique({ where: { articleUrl } });
}

export async function findSimilarTitleDuplicate(
  title: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; matchedId?: string }> {
  const since = subHours(new Date(), LOOKBACK_HOURS);
  const recent = await prisma.rssItem.findMany({
    where: {
      createdAt: { gte: since },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  for (const item of recent) {
    const sim = titleSimilarity(title, item.title);
    if (sim > TITLE_SIMILARITY_THRESHOLD) {
      return { isDuplicate: true, matchedId: item.id };
    }
  }
  return { isDuplicate: false };
}

export async function checkDuplicates(
  articleUrl: string,
  title: string
): Promise<{ isDuplicate: boolean; reason?: "url" | "title" }> {
  const byUrl = await findDuplicateByUrl(articleUrl);
  if (byUrl) return { isDuplicate: true, reason: "url" };

  const byTitle = await findSimilarTitleDuplicate(title);
  if (byTitle.isDuplicate) return { isDuplicate: true, reason: "title" };

  return { isDuplicate: false };
}
