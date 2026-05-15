import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resetSchedulingDefaults, saveBrandVoice } from "@/app/actions/dashboard";
import { hasAIConfigured } from "@/lib/ai/provider";
import { isTelegramConfigured } from "@/lib/telegram/client";

export default async function SettingsPage() {
  const brand = await prisma.brandVoiceSetting.findFirst();

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
            Telegram:{" "}
            <span className={isTelegramConfigured() ? "text-emerald-400" : "text-amber-400"}>
              {isTelegramConfigured() ? "configured" : "not configured"}
            </span>
          </li>
          <li>
            Make RSS secret:{" "}
            <span className="text-zinc-400">
              {process.env.MAKE_RSS_WEBHOOK_SECRET ? "set" : "dev mode / unset"}
            </span>
          </li>
          <li>
            Default timezone: {process.env.DEFAULT_TIMEZONE ?? "Africa/Lagos"}
          </li>
        </ul>
        <p className="mt-4 text-xs text-zinc-500">
          Configure secrets in .env — never exposed to the browser.
        </p>
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
              "news-reactive, slightly opinionated, not misleading, no financial advice"
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
            placeholder="Forbidden words (comma-separated)"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="preferredPhrases"
            defaultValue={brand?.preferredPhrases.join(", ") ?? ""}
            placeholder="Preferred phrases"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="targetPlatforms"
            defaultValue={brand?.targetPlatforms.join(", ") ?? "x,telegram,instagram"}
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
        <h2 className="mb-4 text-lg font-semibold">Scheduling defaults</h2>
        <p className="mb-4 text-sm text-zinc-400">
          X/Telegram: 2/hr · Instagram: 1/day · TikTok & YouTube Shorts: 1 every 2 days
        </p>
        <form action={resetSchedulingDefaults}>
          <Button type="submit" variant="secondary">
            Reset scheduling to defaults
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Webhook endpoints</h2>
        <ul className="space-y-2 font-mono text-xs text-zinc-400">
          <li>POST {process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/webhooks/rss-item</li>
          <li>GET .../api/queue/next-post?platform=x</li>
          <li>POST .../api/queue/mark-posted</li>
          <li>POST .../api/ai/generate-from-rss/[rssItemId]</li>
        </ul>
      </Card>
    </div>
  );
}
