import OpenAI from "openai";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db";
import { buildScenes, type VideoScene } from "@/lib/ai/scenes";
import {
  synthesizeSpeechToFile,
  isTtsEnabled,
  getDefaultVoice,
} from "@/lib/ai/tts";

const VIDEO_PLATFORMS = new Set(["tiktok", "instagram", "youtube_shorts"]);
const PUBLIC_DIR = path.join(process.cwd(), "public", "media", "videos");
const TMP_DIR = path.join(process.cwd(), "tmp", "video-build");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const MIN_SCENE_SECONDS = 2.2;

export function isVideoGenerationEnabled(): boolean {
  return (
    process.env.VIDEO_GENERATION_ENABLED === "true" &&
    Boolean(process.env.OPENAI_API_KEY)
  );
}

export function isPlatformVideo(platform: string): boolean {
  return VIDEO_PLATFORMS.has(platform);
}

function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (ffmpegStatic && existsSync(ffmpegStatic as unknown as string)) {
    return ffmpegStatic as unknown as string;
  }
  return "ffmpeg";
}

function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  const bundled = (ffprobeStatic as { path?: string } | undefined)?.path;
  if (bundled && existsSync(bundled)) return bundled;
  return "ffprobe";
}

function getFontPath(): string | null {
  if (process.env.VIDEO_FONT_PATH && existsSync(process.env.VIDEO_FONT_PATH)) {
    return process.env.VIDEO_FONT_PATH;
  }
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function stripEmoji(text: string): string {
  return text
    .replace(
      /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/\uFE0F/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function wrapCaption(text: string, maxPerLine = 28): string {
  const clean = stripEmoji(text);
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxPerLine) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current ? current + " " : "") + w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3).join("\n");
}

async function runFfmpeg(args: string[]): Promise<void> {
  const bin = getFfmpegPath();
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

async function ffprobeDuration(file: string): Promise<number> {
  const bin = getFfprobePath();
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => {
      reject(
        new Error(
          `ffprobe not found at "${bin}". Install ffprobe (apt install ffmpeg) or set FFPROBE_PATH. (${err.message})`
        )
      );
    });
    proc.on("close", (code) => {
      if (code === 0) {
        const n = parseFloat(stdout.trim());
        if (!isFinite(n) || n <= 0) {
          reject(new Error(`Invalid duration for ${file}`));
        } else resolve(n);
      } else {
        reject(new Error(`ffprobe exited ${code}: ${stderr.slice(-400)}`));
      }
    });
  });
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

async function generateSceneImage(
  client: OpenAI,
  prompt: string,
  dest: string
): Promise<void> {
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const size = (process.env.OPENAI_VIDEO_IMAGE_SIZE ??
    (model === "gpt-image-1" ? "1024x1536" : "1024x1792")) as
    | "1024x1024"
    | "1024x1536"
    | "1024x1792"
    | "1536x1024"
    | "1792x1024";
  const response = await client.images.generate({
    model,
    prompt: prompt.slice(0, 3800),
    n: 1,
    size,
  });
  const item = response.data?.[0];
  if (!item) throw new Error("No image returned from OpenAI");
  if (item.b64_json) {
    await writeFile(dest, Buffer.from(item.b64_json, "base64"));
    return;
  }
  if (item.url) {
    await downloadToFile(item.url, dest);
    return;
  }
  throw new Error("OpenAI image response had no b64_json or url");
}

interface AssembledScene extends VideoScene {
  imagePath: string;
  audioPath: string;
  durationSec: number;
}

function buildFilterComplex(
  scenes: AssembledScene[],
  fontPath: string | null,
  withCaptions: boolean
): string {
  const segments: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    let drawtext = "";
    if (withCaptions && fontPath) {
      const wrapped = wrapCaption(s.caption);
      if (wrapped) {
        drawtext = `,drawtext=fontfile='${fontPath}':text='${escapeDrawtext(wrapped)}':fontsize=58:fontcolor=white:bordercolor=black:borderw=4:line_spacing=10:x=(w-text_w)/2:y=h-text_h-260:box=1:boxcolor=black@0.55:boxborderw=24`;
      }
    }
    segments.push(
      `[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,fps=${FPS}${drawtext}[v${i}]`
    );
  }
  const videoLabels = scenes.map((_, i) => `[v${i}]`).join("");
  const audioLabels = scenes.map((_, i) => `[${scenes.length + i}:a]`).join("");
  segments.push(`${videoLabels}concat=n=${scenes.length}:v=1:a=0[outv]`);
  segments.push(`${audioLabels}concat=n=${scenes.length}:v=0:a=1[outa]`);
  return segments.join(";");
}

function buildEncodeArgs(
  assembled: AssembledScene[],
  outputPath: string,
  filter: string
): string[] {
  const args: string[] = ["-y"];
  for (const s of assembled) {
    args.push("-loop", "1", "-t", s.durationSec.toFixed(2), "-i", s.imagePath);
  }
  for (const s of assembled) {
    args.push("-i", s.audioPath);
  }
  args.push(
    "-filter_complex",
    filter,
    "-map",
    "[outv]",
    "-map",
    "[outa]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-r",
    String(FPS),
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath
  );
  return args;
}

function isFilterError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Filter not found|No such filter|drawtext/i.test(msg);
}

export async function generateVideoForPost(
  generatedPostId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isVideoGenerationEnabled()) {
    return { ok: false, error: "Video generation disabled (set VIDEO_GENERATION_ENABLED=true)" };
  }
  if (!isTtsEnabled()) {
    return { ok: false, error: "OPENAI_API_KEY not set" };
  }

  const post = await prisma.generatedPost.findUnique({
    where: { id: generatedPostId },
  });
  if (!post) return { ok: false, error: "Post not found" };
  if (!isPlatformVideo(post.platform)) {
    return { ok: false, error: `Platform ${post.platform} is not a video platform` };
  }
  if (!post.contentText.trim()) {
    return { ok: false, error: "Post has no script (contentText) to narrate" };
  }

  const metadata = (post.metadata as Record<string, unknown> | null) ?? {};
  const visualSuggestions = Array.isArray(metadata.visual_suggestions)
    ? (metadata.visual_suggestions as string[])
    : undefined;

  const scenes = buildScenes({
    hook: post.hook,
    script: post.contentText,
    visualSuggestions,
    basePrompt: post.imagePrompt,
  });

  if (scenes.length === 0) {
    return { ok: false, error: "Could not split script into scenes" };
  }

  const workDir = path.join(TMP_DIR, generatedPostId);
  await mkdir(workDir, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const assembled: AssembledScene[] = [];
    for (const scene of scenes) {
      const imagePath = path.join(workDir, `scene-${scene.index}.png`);
      const audioPath = path.join(workDir, `scene-${scene.index}.mp3`);

      await generateSceneImage(client, scene.imagePrompt, imagePath);
      await synthesizeSpeechToFile(
        scene.narration,
        audioPath,
        getDefaultVoice()
      );

      const audioDuration = await ffprobeDuration(audioPath);
      const durationSec = Math.max(MIN_SCENE_SECONDS, audioDuration + 0.25);

      assembled.push({ ...scene, imagePath, audioPath, durationSec });
    }

    const outputPath = path.join(PUBLIC_DIR, `${generatedPostId}.mp4`);
    const fontPath = getFontPath();
    let captionsApplied = Boolean(fontPath);

    try {
      const filter = buildFilterComplex(assembled, fontPath, true);
      await runFfmpeg(buildEncodeArgs(assembled, outputPath, filter));
    } catch (err) {
      if (!captionsApplied || !isFilterError(err)) throw err;
      console.warn(
        "[video] drawtext filter failed, retrying without captions:",
        err instanceof Error ? err.message.slice(0, 300) : err
      );
      captionsApplied = false;
      const filter = buildFilterComplex(assembled, null, false);
      await runFfmpeg(buildEncodeArgs(assembled, outputPath, filter));
    }

    const relPath = `/media/videos/${generatedPostId}.mp4`;

    await prisma.generatedPost.update({
      where: { id: generatedPostId },
      data: { mediaUrl: relPath },
    });

    await prisma.mediaAsset.create({
      data: {
        generatedPostId,
        assetType: "video",
        url: relPath,
        prompt: post.imagePrompt,
        status: "generated",
      },
    });

    await prisma.publishLog.create({
      data: {
        generatedPostId,
        platform: post.platform,
        action: "video_generate",
        status: "success",
        message: `Generated ${assembled.length}-scene video${captionsApplied ? "" : " (captions skipped — drawtext unavailable)"}`,
      },
    });

    return { ok: true, url: relPath };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Video generation failed";
    await prisma.publishLog.create({
      data: {
        generatedPostId,
        platform: post.platform,
        action: "video_generate",
        status: "failed",
        message: msg.slice(0, 1000),
      },
    });
    return { ok: false, error: msg };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
