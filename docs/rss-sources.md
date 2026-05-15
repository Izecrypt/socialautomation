# RSS Sources

## Default seeded feeds

| Source | Category | Priority |
|--------|----------|----------|
| CoinDesk | Breaking Crypto News | high |
| Cointelegraph | Breaking Crypto News | high |
| Decrypt | AI Crypto | medium |
| CryptoSlate | Breaking Crypto News | medium |
| CryptoPotato | Market Analysis | medium |
| CryptoNews | Breaking Crypto News | medium |
| The Defiant | DeFi | medium |
| Bitcoin Magazine | Bitcoin | high |
| Bitcoin.com News | Bitcoin | medium |
| AMBCrypto | Market Analysis | low |
| BeInCrypto | Breaking Crypto News | medium |
| U.Today | Market Analysis | low |
| NewsBTC | Market Analysis | low |
| CCN | Breaking Crypto News | low |

## Seed command

```bash
npm run db:seed
```

## Source fields

- `name`, `feedUrl`, `category`, `priority`, `checkFrequency`
- `keywords`, `excludedKeywords`, `status` (active/paused)
