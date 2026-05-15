import { prisma } from "@/lib/db";
import { getSchedulingSettings } from "@/lib/ai/generator";
import type { Platform } from "@/generated/prisma/client";
import { subHours, subMinutes } from "date-fns";

function isWithinActiveHours(
  hour: number,
  start: number,
  end: number
): boolean {
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function getHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    return new Date().getUTCHours();
  }
}

export async function selectNextPost(platform: Platform) {
  const settings = await getSchedulingSettings();
  const platformSettings = settings.platforms[platform];
  const timezone = settings.timezone;
  const hour = getHourInTimezone(timezone);

  if (
    platformSettings &&
    !isWithinActiveHours(
      hour,
      platformSettings.activeHoursStart,
      platformSettings.activeHoursEnd
    )
  ) {
    return null;
  }

  const minGap = platformSettings?.minGapMinutes ?? 30;
  const since = subMinutes(new Date(), minGap);

  const recentPosted = await prisma.generatedPost.findFirst({
    where: {
      platform,
      status: "posted",
      updatedAt: { gte: since },
    },
  });
  if (recentPosted) return null;

  const cooldownSince = subHours(
    new Date(),
    settings.duplicateTopicCooldownHours
  );

  const candidate = await prisma.generatedPost.findFirst({
    where: {
      platform,
      status: { in: ["approved", "scheduled"] },
      riskScore: { not: "high" },
      OR: [
        { scheduledAt: { lte: new Date() } },
        { scheduledAt: null },
      ],
    },
    include: {
      rssItem: true,
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
  });

  if (!candidate) return null;

  const sameTopic = await prisma.generatedPost.findFirst({
    where: {
      platform,
      status: "posted",
      rssItemId: candidate.rssItemId,
      updatedAt: { gte: cooldownSince },
    },
  });
  if (sameTopic) return null;

  if (
    settings.autoPostRiskLevel === "low" &&
    candidate.riskScore !== "low" &&
    candidate.status !== "approved"
  ) {
    return null;
  }

  return candidate;
}

export async function markPostPosted(
  generatedPostId: string,
  platform: Platform,
  externalId?: string,
  message?: string
) {
  await prisma.generatedPost.update({
    where: { id: generatedPostId },
    data: { status: "posted", scheduledAt: new Date() },
  });

  const post = await prisma.generatedPost.findUnique({
    where: { id: generatedPostId },
    select: { rssItemId: true },
  });

  if (post) {
    await prisma.rssItem.update({
      where: { id: post.rssItemId },
      data: { status: "posted" },
    });
  }

  await prisma.publishLog.create({
    data: {
      generatedPostId,
      platform,
      action: "publish",
      status: "posted",
      message: message ?? "Marked posted",
      payload: externalId ? { external_id: externalId } : undefined,
    },
  });
}

export async function markPostFailed(
  generatedPostId: string,
  platform: Platform,
  error: string
) {
  await prisma.generatedPost.update({
    where: { id: generatedPostId },
    data: { status: "failed" },
  });

  await prisma.publishLog.create({
    data: {
      generatedPostId,
      platform,
      action: "publish",
      status: "failed",
      message: error,
    },
  });
}
