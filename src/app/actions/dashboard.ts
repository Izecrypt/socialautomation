"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateFromRssItem, runRiskCheck } from "@/lib/ai/generator";
import { sourceFormSchema } from "@/lib/validation/schemas";

export async function createSource(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    feedUrl: formData.get("feedUrl") as string,
    category: formData.get("category") as string,
    priority: formData.get("priority") as "high" | "medium" | "low",
    checkFrequency: formData.get("checkFrequency") as
      | "mins_5"
      | "mins_15"
      | "mins_30"
      | "mins_60",
    keywords: (formData.get("keywords") as string)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [],
    excludedKeywords: (formData.get("excludedKeywords") as string)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [],
    status: (formData.get("status") as "active" | "paused") ?? "active",
  };

  const parsed = sourceFormSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid source data");

  await prisma.source.create({ data: parsed.data });
  revalidatePath("/dashboard/news-sources");
}

export async function updateSource(id: string, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    feedUrl: formData.get("feedUrl") as string,
    category: formData.get("category") as string,
    priority: formData.get("priority") as "high" | "medium" | "low",
    checkFrequency: formData.get("checkFrequency") as
      | "mins_5"
      | "mins_15"
      | "mins_30"
      | "mins_60",
    keywords: (formData.get("keywords") as string)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [],
    excludedKeywords: (formData.get("excludedKeywords") as string)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [],
    status: formData.get("status") as "active" | "paused",
  };

  const parsed = sourceFormSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid source data");

  await prisma.source.update({ where: { id }, data: parsed.data });
  revalidatePath("/dashboard/news-sources");
}

export async function deleteSource(id: string) {
  await prisma.source.delete({ where: { id } });
  revalidatePath("/dashboard/news-sources");
}

export async function toggleSourceStatus(id: string, status: "active" | "paused") {
  await prisma.source.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/news-sources");
}

export async function updateRssItemStatus(
  id: string,
  status: "queued" | "ignored" | "rejected"
) {
  await prisma.rssItem.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/news-inbox");
}

export async function triggerGenerate(rssItemId: string) {
  await generateFromRssItem(rssItemId);
  revalidatePath("/dashboard/news-inbox");
  revalidatePath("/dashboard/generated-content");
}

export async function updateGeneratedPost(
  id: string,
  data: {
    contentText?: string;
    hook?: string;
    status?: string;
    scheduledAt?: string | null;
  }
) {
  await prisma.generatedPost.update({
    where: { id },
    data: {
      ...(data.contentText !== undefined && { contentText: data.contentText }),
      ...(data.hook !== undefined && { hook: data.hook }),
      ...(data.status && {
        status: data.status as
          | "draft"
          | "needs_review"
          | "approved"
          | "scheduled"
          | "posted"
          | "failed"
          | "rejected",
      }),
      ...(data.scheduledAt !== undefined && {
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      }),
    },
  });
  revalidatePath("/dashboard/generated-content");
  revalidatePath("/dashboard/content-queue");
}

export async function approvePost(id: string) {
  await prisma.generatedPost.update({
    where: { id },
    data: { status: "approved" },
  });
  revalidatePath("/dashboard/generated-content");
  revalidatePath("/dashboard/content-queue");
}

export async function rejectPost(id: string) {
  await prisma.generatedPost.update({
    where: { id },
    data: { status: "rejected" },
  });
  revalidatePath("/dashboard/generated-content");
}

export async function schedulePost(id: string, scheduledAt: string) {
  await prisma.generatedPost.update({
    where: { id },
    data: { status: "scheduled", scheduledAt: new Date(scheduledAt) },
  });
  await prisma.scheduledPost.create({
    data: {
      generatedPostId: id,
      platform: (
        await prisma.generatedPost.findUniqueOrThrow({ where: { id } })
      ).platform,
      scheduledAt: new Date(scheduledAt),
      status: "pending",
    },
  });
  revalidatePath("/dashboard/content-queue");
}

export async function triggerRiskCheck(id: string) {
  await runRiskCheck(id);
  revalidatePath("/dashboard/generated-content");
}

export async function resetSchedulingDefaults() {
  await prisma.appSetting.upsert({
    where: { key: "scheduling" },
    create: {
      key: "scheduling",
      value: getDefaultScheduling(),
    },
    update: { value: getDefaultScheduling() },
  });
  revalidatePath("/dashboard/settings");
}

function getDefaultScheduling() {
  return {
    platforms: {
      x: { postsPerHour: 2, activeHoursStart: 8, activeHoursEnd: 22, minGapMinutes: 30 },
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
  };
}

export async function saveSettings(key: string, value: object) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
  revalidatePath("/dashboard/settings");
}

export async function saveBrandVoice(formData: FormData) {
  const data = {
    brandName: formData.get("brandName") as string,
    tone: formData.get("tone") as string,
    postingStyle: formData.get("postingStyle") as string,
    disclaimerStyle: formData.get("disclaimerStyle") as string,
    maxHypeLevel: parseInt(formData.get("maxHypeLevel") as string, 10) || 3,
    forbiddenWords: (formData.get("forbiddenWords") as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    preferredPhrases: (formData.get("preferredPhrases") as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    targetPlatforms: (formData.get("targetPlatforms") as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  const existing = await prisma.brandVoiceSetting.findFirst();
  if (existing) {
    await prisma.brandVoiceSetting.update({ where: { id: existing.id }, data });
  } else {
    await prisma.brandVoiceSetting.create({ data });
  }
  revalidatePath("/dashboard/settings");
}
