import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  resetSchedulingDefaults,
  saveBrandVoice,
  saveSchedulingSettings,
} from "@/app/actions/dashboard";
import { hasAIConfigured } from "@/lib/ai/provider";
import { isImageGenerationEnabled } from "@/lib/ai/images";
import { isDiscordConfigured } from "@/lib/discord/client";
import { isTelegramConfigured } from "@/lib/telegram/client";
import { getSchedulingSettings } from "@/lib/scheduling/settings";

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-zinc-500">{children}</p>;
}

export default async function SettingsPage() {
  const [brand, scheduling] = await Promise.all([
    prisma.brandVoiceSetting.findFirst(),
    getSchedulingSettings(),
  ]);

  const x = scheduling.platforms.x;
  const tg = scheduling.platforms.telegram;
  const ig = scheduling.platforms.instagram;
  const tt = scheduling.platforms.tiktok;
  const yt = scheduling.platforms.youtube_shorts;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-zinc-400">API keys, scheduling, and brand voice</p>
      </header>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Integration status</h2>
        <ul className="space-y-2 text-sm">
          <li>
            AI (OpenAI):{" "}
            <span className={hasAIConfigured() ? "text-emerald-400" : "text-amber-400"}>
              {hasAIConfigured() ? "configured" : "not configured — mock mode"}
            </span>
          </li>
          <li>
            Image generation:{" "}
            <span className={isImageGenerationEnabled() ? "text-emerald-400" : "text-amber-400"}>
              {isImageGenerationEnabled() ? "enabled" : "disabled (set IMAGE_GENERATION_ENABLED=true)"}
            </span>
          </li>
          <li>
            Discord:{" "}
            <span className={isDiscordConfigured() ? "text-emerald-400" : "text-amber-400"}>
              {isDiscordConfigured() ? "configured" : "not configured"}
            </span>
          </li>
          <li>
            Telegram:{" "}
            <span className={isTelegramConfigured() ? "text-emerald-400" : "text-amber-400"}>
              {isTelegramConfigured() ? "configured" : "not configured"}
            </span>
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">Posting schedule</h2>
        <p className="mb-6 text-sm text-zinc-400">
          Controls how often Make.com (or cron) can pull the next approved post per platform.
          Minimum gap between posts is calculated as 60 ÷ posts per hour for X and Telegram.
        </p>
        <form action={saveSchedulingSettings} className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">X — posts per hour</label>
            <input
              name="xPostsPerHour"
              type="number"
              min={1}
              max={10}
              defaultValue={x.postsPerHour ?? 2}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <FieldHelp>
              Max posts per hour during active hours. At 3/hr, the app enforces at least ~20
              minutes between X posts.
            </FieldHelp>
          </div>

          <div>
            <label className="text-sm font-medium">Telegram — posts per hour</label>
            <input
              name="telegramPostsPerHour"
              type="number"
              min={1}
              max={10}
              defaultValue={tg.postsPerHour ?? 2}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <FieldHelp>Same rate logic as X. Telegram can also be posted via Make or the bot API.</FieldHelp>
          </div>

          <div>
            <label className="text-sm font-medium">Instagram — posts per day</label>
            <input
              name="instagramPostsPerDay"
              type="number"
              min={1}
              max={10}
              defaultValue={ig.postsPerDay ?? 1}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <FieldHelp>Maximum Instagram posts per calendar day in your timezone.</FieldHelp>
          </div>

          <div>
            <label className="text-sm font-medium">TikTok — every N days</label>
            <input
              name="tiktokEveryNDays"
              type="number"
              min={1}
              max={14}
              defaultValue={tt.everyNDays ?? 2}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <FieldHelp>Minimum days between TikTok short-video publishes (script only; upload via Make).</FieldHelp>
          </div>

          <div>
            <label className="text-sm font-medium">YouTube Shorts — every N days</label>
            <input
              name="youtubeEveryNDays"
              type="number"
              min={1}
              max={14}
              defaultValue={yt.everyNDays ?? 2}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <FieldHelp>Minimum days between YouTube Shorts publishes.</FieldHelp>
          </div>

          <div>
            <label className="text-sm font-medium">Niche mode</label>
            <select
              name="nicheMode"
              defaultValue={scheduling.nicheMode}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="all">All crypto news</option>
              <option value="crypto_ai">Crypto AI only (auto-queue)</option>
            </select>
            <FieldHelp>
              Crypto AI mode: only auto-queue items with AI keywords or from an AI Crypto source.
              Others stay on the watchlist.
            </FieldHelp>
          </div>

          <div>
            <label className="text-sm font-medium">Active hours (start)</label>
            <input
              name="activeHoursStart"
              type="number"
              min={0}
              max={23}
              defaultValue={x.activeHoursStart}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Active hours (end)</label>
            <input
              name="activeHoursEnd"
              type="number"
              min={1}
              max={24}
              defaultValue={x.activeHoursEnd}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <FieldHelp>Posts are only released from the queue during these hours (local timezone).</FieldHelp>
          </div>

          <div>
            <label className="text-sm font-medium">Timezone</label>
            <input
              name="timezone"
              defaultValue={scheduling.timezone}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Duplicate topic cooldown (hours)</label>
            <input
              name="duplicateTopicCooldownHours"
              type="number"
              min={1}
              max={48}
              defaultValue={scheduling.duplicateTopicCooldownHours}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <FieldHelp>Do not repost the same RSS story on the same platform within this window.</FieldHelp>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              name="approvalRequired"
              id="approvalRequired"
              defaultChecked={scheduling.approvalRequired}
              className="rounded border-zinc-600"
            />
            <label htmlFor="approvalRequired" className="text-sm">
              Require manual approval before posts enter the publish queue
            </label>
          </div>

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">Save scheduling</Button>
          </div>
        </form>
        <form action={resetSchedulingDefaults} className="mt-4">
          <Button type="submit" variant="secondary">
            Reset scheduling to defaults
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Brand voice</h2>
        <form action={saveBrandVoice} className="grid gap-4 md:grid-cols-2">
          <input
            name="brandName"
            defaultValue={brand?.brandName ?? "Crypto Pulse"}
            placeholder="Brand name"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            name="tone"
            defaultValue={brand?.tone ?? "crypto-native, punchy, clear, fast"}
            placeholder="Tone"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <textarea
            name="postingStyle"
            defaultValue={
              brand?.postingStyle ??
              "Crypto AI niche: agents, compute, DePIN. News-reactive, no financial advice."
            }
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
            rows={2}
          />
          <input
            name="disclaimerStyle"
            defaultValue={brand?.disclaimerStyle ?? "Not financial advice. DYOR."}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="forbiddenWords"
            defaultValue={brand?.forbiddenWords.join(", ") ?? "guaranteed,100x,buy now"}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="preferredPhrases"
            defaultValue={brand?.preferredPhrases.join(", ") ?? ""}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="targetPlatforms"
            defaultValue={
              brand?.targetPlatforms.join(", ") ?? "x,telegram,instagram,tiktok,youtube_shorts"
            }
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            name="maxHypeLevel"
            type="number"
            min={1}
            max={5}
            defaultValue={brand?.maxHypeLevel ?? 3}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <Button type="submit" className="md:col-span-2">
            Save brand voice
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Webhook endpoints</h2>
        <ul className="space-y-2 font-mono text-xs text-zinc-400">
          <li>POST {process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/webhooks/rss-item</li>
          <li>GET .../api/queue/next-post?platform=x</li>
          <li>POST .../api/queue/approve/[postId]</li>
          <li>POST .../api/queue/mark-posted</li>
        </ul>
      </Card>
    </div>
  );
}
