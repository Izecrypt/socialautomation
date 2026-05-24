# Video generation (TikTok / Instagram Reels / YouTube Shorts)

Produces a vertical **1080×1920 MP4** for each AI-generated short-video post, using:

- **OpenAI image model** (default `gpt-image-1`) — one image per scene
- **OpenAI TTS** — voiceover per scene
- **ffmpeg** (via [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static)) — assembly with burned-in captions

Output is saved to `public/media/videos/<postId>.mp4` and exposed at:

```
${APP_BASE_URL}/media/videos/<postId>.mp4
```

That URL is written into `GeneratedPost.mediaUrl`, so `GET /api/queue/next-post` returns it to Make.com automatically — no Make changes required.

---

## Enable

In `.env`:

```env
OPENAI_API_KEY=sk-...                   # required (DALL·E + TTS)
VIDEO_GENERATION_ENABLED=true           # required

# Optional
OPENAI_TTS_MODEL=tts-1                  # tts-1 or tts-1-hd
OPENAI_TTS_VOICE=onyx                   # alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer
OPENAI_VIDEO_IMAGE_SIZE=1024x1536       # portrait image size for video scenes
OPENAI_IMAGE_MODEL=gpt-image-1          # default. dall-e-3 was retired.
FFMPEG_PATH=/usr/bin/ffmpeg             # only if not using bundled binary
VIDEO_FONT_PATH=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
APP_BASE_URL=https://social.playtrenches.xyz
```

`ffmpeg-static` ships a portable binary inside `node_modules`, so no system `ffmpeg` install is required. If you prefer the system binary, set `FFMPEG_PATH`.

A bold sans-serif TTF must exist for caption burn-in. On Ubuntu/Debian the default DejaVu path is auto-detected. To install if missing:

```bash
sudo apt install fonts-dejavu fonts-liberation
```

---

## How it works

For each `GeneratedPost` with platform `tiktok`, `instagram`, or `youtube_shorts`:

1. **Scene split** ([`src/lib/ai/scenes.ts`](../src/lib/ai/scenes.ts)) — 3–6 scenes built from `metadata.visual_suggestions` (preferred) or the script's sentences. Each scene has narration text, a short caption, and an image prompt.
2. **Per-scene image** — `gpt-image-1` at portrait `1024x1536`, decoded from `b64_json` into a per-post temp dir.
3. **Per-scene TTS** — OpenAI TTS to mp3. Audio duration probed via ffprobe → scene length.
4. **ffmpeg single pass:**
   - Each image scaled/cropped to 1080×1920.
   - Caption wrapped (~28 chars/line, up to 3 lines) burned in via `drawtext` with a translucent black box, white text, 4px black outline.
   - All scene videos concatenated.
   - All scene audios concatenated.
   - H.264 / AAC / `+faststart`.
5. **Persistence:**
   - `GeneratedPost.mediaUrl` ← `${APP_BASE_URL}/media/videos/<postId>.mp4`
   - `MediaAsset` row with `assetType: "video"`, `status: "generated"`
   - `PublishLog` `video_generate` success or failed
6. Temp working directory is cleaned up.

---

## Triggering generation

### From the dashboard

**Dashboard → Generated Content** → expand a TikTok / Instagram / YouTube Shorts card → **Generate video**.

The button is disabled until `VIDEO_GENERATION_ENABLED=true` and `OPENAI_API_KEY` is set.

### From an API (Make.com or curl)

```bash
curl -X POST \
  -H "x-make-webhook-secret: $MAKE_PUBLISH_WEBHOOK_SECRET" \
  "$APP_BASE_URL/api/ai/generate-video/<postId>"
```

Success:

```json
{ "success": true, "data": { "media_url": "https://.../media/videos/<id>.mp4" } }
```

Make.com pattern (one option):

```
HTTP GET next-post?platform=tiktok
  → Filter: post exists AND post.media_url is empty
  → HTTP POST generate-video/<post.id>
  → HTTP GET next-post?platform=tiktok (refetch, now has media_url)
  → Uploader (Blotato / Upload-Post / manual)
  → HTTP POST mark-posted
```

Or **generate on approve** by extending `approvePost` later; the building blocks are in place.

---

## Cost estimate per ~30s video

| Resource | Volume | Unit cost (USD) | Total |
|----------|--------|------------------|-------|
| `gpt-image-1` images (5 scenes × `1024x1536`, medium quality) | 5 | ~$0.04 | ~$0.20 |
| OpenAI TTS `tts-1` (~30s narration) | ~600 chars | $0.015 / 1k chars | ~$0.01 |
| ffmpeg encode | local CPU | — | — |
| **≈ per video** | | | **~$0.21** |

Pricing varies by quality tier (`low` / `medium` / `high`). Drop to `OPENAI_VIDEO_IMAGE_SIZE=1024x1024` and 3 scenes for ~$0.06/video.

---

## Publishing the video

Buffer free does **not** support TikTok or IG Reels uploads. Options:

- **Manual** — preview the video in the dashboard, download, post.
- **Blotato** / **Upload-Post** — accepts a `media_url` + caption, posts to TikTok/IG/YT. Wire into Make.com after `generate-video`.
- **Buffer paid plan** — supports IG Reels / TikTok.
- **Direct platform APIs** — TikTok Content Posting API or IG Graph (business accounts).

The app already returns `media_url`, `content_text`, and `hashtags` from `next-post`, so any uploader that takes those fields plugs in directly.

---

## Failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Video generation disabled` | Env flag off | `VIDEO_GENERATION_ENABLED=true` |
| `OPENAI_API_KEY not set` | Missing key | Add to `.env` |
| `ffmpeg exited 1: ...` (in PublishLog) | Image download / font path / filter syntax | Check log; verify `VIDEO_FONT_PATH` exists |
| Captions missing | No font detected | Install `fonts-dejavu` or set `VIDEO_FONT_PATH` |
| Video plays but Buffer/uploader can't fetch | `APP_BASE_URL` wrong or site not public | Set correct production URL; ensure `/media/videos/*.mp4` is reachable externally |
| 504/timeout on API call | Long generation (~30–90s) behind reverse proxy | Increase Nginx `proxy_read_timeout` on `/api/ai/generate-video/` location (e.g. `proxy_read_timeout 300s;`) |

---

## Manual ffmpeg test

If you want to verify the binary + font without the full pipeline:

```bash
node -e "console.log(require('ffmpeg-static'))"
```

Prints the bundled binary path. Run `<that path> -version` to confirm.
