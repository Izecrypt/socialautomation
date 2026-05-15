import type { SourceCategory } from "./categories";

export interface SeedSource {
  name: string;
  feedUrl: string;
  category: SourceCategory;
  priority: "high" | "medium" | "low";
}

export const DEFAULT_RSS_SOURCES: SeedSource[] = [
  {
    name: "CoinDesk",
    feedUrl: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    category: "Breaking Crypto News",
    priority: "high",
  },
  {
    name: "Cointelegraph",
    feedUrl: "https://cointelegraph.com/rss",
    category: "Breaking Crypto News",
    priority: "high",
  },
  {
    name: "Decrypt",
    feedUrl: "https://decrypt.co/feed",
    category: "AI Crypto",
    priority: "medium",
  },
  {
    name: "CryptoSlate",
    feedUrl: "https://cryptoslate.com/feed",
    category: "Breaking Crypto News",
    priority: "medium",
  },
  {
    name: "CryptoPotato",
    feedUrl: "https://cryptopotato.com/feed",
    category: "Market Analysis",
    priority: "medium",
  },
  {
    name: "CryptoNews",
    feedUrl: "https://cryptonews.com/news/feed/",
    category: "Breaking Crypto News",
    priority: "medium",
  },
  {
    name: "The Defiant",
    feedUrl: "https://thedefiant.io/feed",
    category: "DeFi",
    priority: "medium",
  },
  {
    name: "Bitcoin Magazine",
    feedUrl: "https://bitcoinmagazine.com/.rss/full/",
    category: "Bitcoin",
    priority: "high",
  },
  {
    name: "Bitcoin.com News",
    feedUrl: "https://news.bitcoin.com/feed/",
    category: "Bitcoin",
    priority: "medium",
  },
  {
    name: "AMBCrypto",
    feedUrl: "https://ambcrypto.com/feed",
    category: "Market Analysis",
    priority: "low",
  },
  {
    name: "BeInCrypto",
    feedUrl: "https://beincrypto.com/feed",
    category: "Breaking Crypto News",
    priority: "medium",
  },
  {
    name: "U.Today",
    feedUrl: "https://u.today/rss",
    category: "Market Analysis",
    priority: "low",
  },
  {
    name: "NewsBTC",
    feedUrl: "https://www.newsbtc.com/feed/",
    category: "Market Analysis",
    priority: "low",
  },
  {
    name: "CCN",
    feedUrl: "https://www.ccn.com/feed/",
    category: "Breaking Crypto News",
    priority: "low",
  },
];
