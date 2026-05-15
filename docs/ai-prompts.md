# AI Prompts

Implemented in `src/lib/ai/prompts.ts`.

## 1. RSS News Summarizer

Grounded analysis JSON: summary, key_angle, market_relevance, assets, urgency.

## 2. Platform Content Generator

Produces X, Telegram, Instagram (caption + carousel), short video script, image prompt.

Constraints:
- No invented facts
- No financial advice
- Original brand voice (Crypto Pulse default)

## 3. Risk Filter

Classifies low/medium/high; flags advice, pumps, rumors, fake urgency.

## Provider

Set `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Without key, **mock content** is generated for development.

## Endpoints

- `POST /api/ai/generate-from-rss/:rssItemId`
- `POST /api/ai/risk-check/:generatedPostId`
