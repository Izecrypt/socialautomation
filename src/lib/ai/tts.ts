import OpenAI from "openai";
import { writeFile } from "node:fs/promises";

export function isTtsEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export type TtsVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer";

export function getDefaultVoice(): TtsVoice {
  const v = (process.env.OPENAI_TTS_VOICE ?? "onyx").toLowerCase() as TtsVoice;
  return v;
}

export function getTtsModel(): string {
  return process.env.OPENAI_TTS_MODEL ?? "tts-1";
}

export async function synthesizeSpeechToFile(
  text: string,
  destPath: string,
  voice: TtsVoice = getDefaultVoice()
): Promise<void> {
  if (!isTtsEnabled()) {
    throw new Error("OPENAI_API_KEY not set");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const trimmed = text.trim().slice(0, 4000);
  if (!trimmed) throw new Error("Empty TTS text");

  const response = await client.audio.speech.create({
    model: getTtsModel(),
    voice,
    input: trimmed,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}
