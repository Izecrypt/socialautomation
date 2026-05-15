import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_RSS_SOURCES } from "../src/lib/constants/seed-sources";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database…");

  for (const src of DEFAULT_RSS_SOURCES) {
    const existing = await prisma.source.findFirst({
      where: { feedUrl: src.feedUrl },
    });
    if (existing) {
      console.log(`Skip existing: ${src.name}`);
      continue;
    }
    await prisma.source.create({
      data: {
        name: src.name,
        feedUrl: src.feedUrl,
        category: src.category,
        priority: src.priority,
        checkFrequency: "mins_15",
        status: "active",
      },
    });
    console.log(`Created source: ${src.name}`);
  }

  const brand = await prisma.brandVoiceSetting.findFirst();
  if (!brand) {
    await prisma.brandVoiceSetting.create({
      data: {
        brandName: "Crypto Pulse",
        tone: "crypto-native, punchy, clear, fast, news-reactive",
        postingStyle:
          "slightly opinionated, not misleading, no fake certainty, no financial advice",
        disclaimerStyle: "Not financial advice. DYOR.",
        maxHypeLevel: 3,
        forbiddenWords: ["guaranteed", "100x", "buy now", "sell now"],
        preferredPhrases: [],
        targetPlatforms: ["x", "telegram", "instagram", "tiktok"],
      },
    });
    console.log("Created default brand voice");
  }

  await prisma.appSetting.upsert({
    where: { key: "scheduling" },
    create: {
      key: "scheduling",
      value: {
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
      },
    },
    update: {},
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
