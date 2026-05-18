import { prisma } from "@/lib/db";
import type { Platform } from "@/generated/prisma/client";
import type { SchedulingSettings } from "./defaults";
import { subDays, subHours, subMinutes } from "date-fns";

function getZonedParts(date: Date, timezone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "0";
    return {
      year: get("year"),
      month: get("month"),
      day: get("day"),
      hour: parseInt(get("hour"), 10),
    };
  } catch {
    return {
      year: String(date.getUTCFullYear()),
      month: String(date.getUTCMonth() + 1).padStart(2, "0"),
      day: String(date.getUTCDate()).padStart(2, "0"),
      hour: date.getUTCHours(),
    };
  }
}

function calendarDayKey(date: Date, timezone: string): string {
  const p = getZonedParts(date, timezone);
  return `${p.year}-${p.month}-${p.day}`;
}

export async function isPlatformRateLimited(
  platform: Platform,
  settings: SchedulingSettings
): Promise<{ limited: boolean; reason?: string }> {
  const platformSettings = settings.platforms[platform];
  if (!platformSettings) return { limited: false };

  const timezone = settings.timezone;
  const now = new Date();

  const minGap = platformSettings.minGapMinutes ?? 30;
  const sinceGap = subMinutes(now, minGap);
  const recentGap = await prisma.generatedPost.findFirst({
    where: {
      platform,
      status: "posted",
      updatedAt: { gte: sinceGap },
    },
  });
  if (recentGap) {
    return { limited: true, reason: "min_gap" };
  }

  if (platformSettings.postsPerHour) {
    const sinceHour = subHours(now, 1);
    const countHour = await prisma.generatedPost.count({
      where: {
        platform,
        status: "posted",
        updatedAt: { gte: sinceHour },
      },
    });
    if (countHour >= platformSettings.postsPerHour) {
      return { limited: true, reason: "hourly_cap" };
    }
  }

  if (platformSettings.postsPerDay) {
    const todayKey = calendarDayKey(now, timezone);
    const postedToday = await prisma.generatedPost.findMany({
      where: {
        platform,
        status: "posted",
        updatedAt: { gte: subDays(now, 2) },
      },
      select: { updatedAt: true },
    });
    const countToday = postedToday.filter(
      (p) => calendarDayKey(p.updatedAt, timezone) === todayKey
    ).length;
    if (countToday >= platformSettings.postsPerDay) {
      return { limited: true, reason: "daily_cap" };
    }
  }

  if (platformSettings.everyNDays) {
    const lastPosted = await prisma.generatedPost.findFirst({
      where: { platform, status: "posted" },
      orderBy: { updatedAt: "desc" },
    });
    if (lastPosted) {
      const minMs = platformSettings.everyNDays * 24 * 60 * 60 * 1000;
      if (now.getTime() - lastPosted.updatedAt.getTime() < minMs) {
        return { limited: true, reason: "every_n_days" };
      }
    }
  }

  return { limited: false };
}
