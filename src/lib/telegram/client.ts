export interface TelegramSendResult {
  ok: boolean;
  messageId?: number;
  error?: string;
}

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  return { token, channelId };
}

export function isTelegramConfigured(): boolean {
  const { token, channelId } = getConfig();
  return Boolean(token && channelId);
}

export function buildSendMessagePayload(text: string, parseMode = "HTML") {
  const { channelId } = getConfig();
  return {
    chat_id: channelId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: false,
  };
}

export function buildSendPhotoPayload(
  photoUrl: string,
  caption?: string,
  parseMode = "HTML"
) {
  const { channelId } = getConfig();
  return {
    chat_id: channelId,
    photo: photoUrl,
    caption,
    parse_mode: parseMode,
  };
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const { token, channelId } = getConfig();
  if (!token || !channelId) {
    return { ok: false, error: "Telegram not configured" };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSendMessagePayload(text)),
  });

  const data = (await res.json()) as {
    ok: boolean;
    result?: { message_id: number };
    description?: string;
  };

  if (!data.ok) {
    return { ok: false, error: data.description ?? "Telegram API error" };
  }

  return { ok: true, messageId: data.result?.message_id };
}

export async function sendTelegramPhoto(
  photoUrl: string,
  caption?: string
): Promise<TelegramSendResult> {
  const { token, channelId } = getConfig();
  if (!token || !channelId) {
    return { ok: false, error: "Telegram not configured" };
  }

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSendPhotoPayload(photoUrl, caption)),
  });

  const data = (await res.json()) as {
    ok: boolean;
    result?: { message_id: number };
    description?: string;
  };

  if (!data.ok) {
    return { ok: false, error: data.description ?? "Telegram API error" };
  }

  return { ok: true, messageId: data.result?.message_id };
}
