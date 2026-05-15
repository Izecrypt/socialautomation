import OpenAI from "openai";
import { safeJsonParse } from "@/lib/utils";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  completeJson<T>(prompt: string, system?: string): Promise<T | null>;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI | null;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    this.client = key ? new OpenAI({ apiKey: key }) : null;
  }

  async completeJson<T>(prompt: string, system?: string): Promise<T | null> {
    if (!this.client) return null;

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            system ??
            "You are a helpful assistant that returns valid JSON only. No markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    return safeJsonParse<T>(text);
  }
}

class MockAIProvider implements AIProvider {
  async completeJson<T>(): Promise<T | null> {
    return null;
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "openai";
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }
  return new MockAIProvider();
}

export function hasAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
