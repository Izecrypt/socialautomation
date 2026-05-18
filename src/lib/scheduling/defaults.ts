import type { Platform, RiskLevel } from "@/generated/prisma/client";

export interface PlatformSchedule {
  postsPerHour?: number;
  postsPerDay?: number;
  everyNDays?: number;
  activeHoursStart: number;
  activeHoursEnd: number;
  minGapMinutes: number;
}

export interface SchedulingSettings {
  platforms: Record<Platform, PlatformSchedule>;
  timezone: string;
  autoPostRiskLevel: RiskLevel;
  approvalRequired: boolean;
  duplicateTopicCooldownHours: number;
  nicheMode: "all" | "crypto_ai";
}

export function minGapFromPostsPerHour(postsPerHour: number): number {
  const n = Math.max(1, Math.min(10, postsPerHour));
  return Math.ceil(60 / n);
}

export function getDefaultScheduling(): SchedulingSettings {
  return {
    platforms: {
      x: {
        postsPerHour: 2,
        activeHoursStart: 8,
        activeHoursEnd: 22,
        minGapMinutes: 30,
      },
      telegram: {
        postsPerHour: 2,
        activeHoursStart: 8,
        activeHoursEnd: 22,
        minGapMinutes: 30,
      },
      instagram: {
        postsPerDay: 1,
        activeHoursStart: 10,
        activeHoursEnd: 20,
        minGapMinutes: 1440,
      },
      tiktok: {
        everyNDays: 2,
        activeHoursStart: 12,
        activeHoursEnd: 21,
        minGapMinutes: 2880,
      },
      youtube_shorts: {
        everyNDays: 2,
        activeHoursStart: 12,
        activeHoursEnd: 21,
        minGapMinutes: 2880,
      },
    },
    timezone: process.env.DEFAULT_TIMEZONE ?? "Africa/Lagos",
    autoPostRiskLevel: "low",
    approvalRequired: true,
    duplicateTopicCooldownHours: 6,
    nicheMode: "all",
  };
}

export function mergeScheduling(stored: unknown): SchedulingSettings {
  const defaults = getDefaultScheduling();
  if (!stored || typeof stored !== "object") return defaults;

  const s = stored as Partial<SchedulingSettings>;
  return {
    ...defaults,
    ...s,
    platforms: {
      ...defaults.platforms,
      ...(s.platforms as SchedulingSettings["platforms"]),
    },
  };
}

export function buildSchedulingFromForm(formData: FormData): SchedulingSettings {
  const defaults = getDefaultScheduling();
  const xRate = parseInt(formData.get("xPostsPerHour") as string, 10) || 2;
  const tgRate = parseInt(formData.get("telegramPostsPerHour") as string, 10) || 2;
  const igPerDay = parseInt(formData.get("instagramPostsPerDay") as string, 10) || 1;
  const tiktokDays = parseInt(formData.get("tiktokEveryNDays") as string, 10) || 2;
  const youtubeDays = parseInt(formData.get("youtubeEveryNDays") as string, 10) || 2;
  const nicheMode =
    formData.get("nicheMode") === "crypto_ai" ? "crypto_ai" : "all";

  return {
    platforms: {
      x: {
        postsPerHour: xRate,
        activeHoursStart:
          parseInt(formData.get("activeHoursStart") as string, 10) ||
          defaults.platforms.x.activeHoursStart,
        activeHoursEnd:
          parseInt(formData.get("activeHoursEnd") as string, 10) ||
          defaults.platforms.x.activeHoursEnd,
        minGapMinutes: minGapFromPostsPerHour(xRate),
      },
      telegram: {
        postsPerHour: tgRate,
        activeHoursStart:
          parseInt(formData.get("activeHoursStart") as string, 10) ||
          defaults.platforms.telegram.activeHoursStart,
        activeHoursEnd:
          parseInt(formData.get("activeHoursEnd") as string, 10) ||
          defaults.platforms.telegram.activeHoursEnd,
        minGapMinutes: minGapFromPostsPerHour(tgRate),
      },
      instagram: {
        postsPerDay: igPerDay,
        activeHoursStart:
          parseInt(formData.get("activeHoursStart") as string, 10) || 10,
        activeHoursEnd:
          parseInt(formData.get("activeHoursEnd") as string, 10) || 20,
        minGapMinutes: 1440,
      },
      tiktok: {
        everyNDays: tiktokDays,
        activeHoursStart: 12,
        activeHoursEnd: 21,
        minGapMinutes: tiktokDays * 24 * 60,
      },
      youtube_shorts: {
        everyNDays: youtubeDays,
        activeHoursStart: 12,
        activeHoursEnd: 21,
        minGapMinutes: youtubeDays * 24 * 60,
      },
    },
    timezone: (formData.get("timezone") as string) || defaults.timezone,
    autoPostRiskLevel: defaults.autoPostRiskLevel,
    approvalRequired: formData.get("approvalRequired") === "on",
    duplicateTopicCooldownHours:
      parseInt(formData.get("duplicateTopicCooldownHours") as string, 10) || 6,
    nicheMode,
  };
}
