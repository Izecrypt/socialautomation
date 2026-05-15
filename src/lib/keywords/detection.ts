import {
  CRYPTO_AI_PRIORITY_KEYWORDS,
  GENERAL_CRYPTO_KEYWORDS,
} from "@/lib/constants/keywords";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(text: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
  return pattern.test(text);
}

export function detectKeywords(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const found = new Set<string>();

  for (const kw of CRYPTO_AI_PRIORITY_KEYWORDS) {
    if (containsKeyword(text, kw)) found.add(kw);
  }
  for (const kw of GENERAL_CRYPTO_KEYWORDS) {
    if (containsKeyword(text, kw)) found.add(kw);
  }

  return Array.from(found);
}

export function hasCryptoAiKeyword(keywords: string[]): boolean {
  return keywords.some((k) =>
    CRYPTO_AI_PRIORITY_KEYWORDS.some((p) => p.toLowerCase() === k.toLowerCase())
  );
}

export function hasMajorToken(keywords: string[]): boolean {
  const majors = ["bitcoin", "btc", "ethereum", "eth", "solana", "sol"];
  return keywords.some((k) => majors.includes(k.toLowerCase()));
}
