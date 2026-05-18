export interface DiscordSendResult {
  ok: boolean;
  error?: string;
}

function getWebhookUrl(): string | undefined {
  return process.env.DISCORD_WEBHOOK_URL?.trim() || undefined;
}

export function isDiscordConfigured(): boolean {
  return Boolean(getWebhookUrl());
}

/** Discord message content max length */
const MAX_CONTENT = 2000;

export function buildDiscordPayload(options: {
  content: string;
  hook?: string | null;
  platform?: string;
  sourceTitle?: string;
  articleUrl?: string;
}): { content: string } {
  const parts: string[] = [];

  if (options.platform) {
    parts.push(`**[${options.platform.toUpperCase()}]**`);
  }
  if (options.hook) {
    parts.push(options.hook);
  }
  parts.push(options.content);
  if (options.sourceTitle && options.articleUrl) {
    parts.push(`\n— ${options.sourceTitle}\n${options.articleUrl}`);
  }

  let text = parts.join("\n\n");
  if (text.length > MAX_CONTENT) {
    text = text.slice(0, MAX_CONTENT - 3) + "...";
  }

  return { content: text };
}

export async function sendDiscordWebhook(
  payload: { content: string }
): Promise<DiscordSendResult> {
  const url = getWebhookUrl();
  if (!url) {
    return { ok: false, error: "DISCORD_WEBHOOK_URL is not configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Discord returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Discord request failed",
    };
  }
}

export async function publishPostToDiscord(options: {
  content: string;
  hook?: string | null;
  platform?: string;
  sourceTitle?: string;
  articleUrl?: string;
}): Promise<DiscordSendResult> {
  const payload = buildDiscordPayload(options);
  return sendDiscordWebhook(payload);
}
