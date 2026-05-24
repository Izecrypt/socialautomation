import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { toAbsoluteUrl } from "@/lib/media/url";

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
/** Default Discord webhook attachment limit (25 MB for default uploads in 2025+) */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function buildDiscordPayload(options: {
  content: string;
  hook?: string | null;
  platform?: string;
  sourceTitle?: string;
  articleUrl?: string;
  mediaUrl?: string | null;
  includeMediaUrl?: boolean;
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
  if (options.includeMediaUrl && options.mediaUrl) {
    parts.push(options.mediaUrl);
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

async function sendDiscordWebhookWithFile(
  payload: { content: string },
  filePath: string,
  fileName: string
): Promise<DiscordSendResult> {
  const url = getWebhookUrl();
  if (!url) {
    return { ok: false, error: "DISCORD_WEBHOOK_URL is not configured" };
  }

  try {
    const buf = await readFile(filePath);
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));
    form.append(
      "files[0]",
      new Blob([new Uint8Array(buf)], { type: "video/mp4" }),
      fileName
    );

    const res = await fetch(url, { method: "POST", body: form });
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
      error: e instanceof Error ? e.message : "Discord upload failed",
    };
  }
}

function localVideoPathForMediaUrl(mediaUrl: string): string | null {
  const match = mediaUrl.match(/\/media\/videos\/([^/?#]+\.mp4)/);
  if (!match) return null;
  return path.join(process.cwd(), "public", "media", "videos", match[1]);
}

export async function publishPostToDiscord(options: {
  content: string;
  hook?: string | null;
  platform?: string;
  sourceTitle?: string;
  articleUrl?: string;
  mediaUrl?: string | null;
}): Promise<DiscordSendResult> {
  if (options.mediaUrl) {
    const local = localVideoPathForMediaUrl(options.mediaUrl);
    if (local) {
      try {
        const info = await stat(local);
        if (info.isFile() && info.size <= MAX_ATTACHMENT_BYTES) {
          const payload = buildDiscordPayload({ ...options, includeMediaUrl: false });
          const fileName = path.basename(local);
          const result = await sendDiscordWebhookWithFile(payload, local, fileName);
          if (result.ok) return result;
        }
      } catch {
        // fall through to URL embed
      }
    }
  }

  const absoluteMediaUrl = toAbsoluteUrl(options.mediaUrl ?? null);
  const payload = buildDiscordPayload({
    ...options,
    mediaUrl: absoluteMediaUrl,
    includeMediaUrl: true,
  });
  return sendDiscordWebhook(payload);
}
