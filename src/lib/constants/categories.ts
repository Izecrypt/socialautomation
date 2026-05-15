export const SOURCE_CATEGORIES = [
  "Breaking Crypto News",
  "Bitcoin",
  "Ethereum",
  "AI Crypto",
  "DeFi",
  "Regulation",
  "Market Analysis",
  "Exchange News",
  "Hacks/Exploits",
  "Macro/Fed/CPI",
  "Project Announcements",
] as const;

export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];
