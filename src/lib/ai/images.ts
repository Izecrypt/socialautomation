import OpenAI from "openai";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db";
import type { Platform } from "@/generated/prisma/client";

const IMAGE_PLATFORMS: Platform[] = ["x", "telegram", "instagram"];
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), "public", "media", "images");

export function isImageGenerationEnabled(): boolean {
  return (
    process.env.IMAGE_GENERATION_ENABLED === "true" &&
    Boolean(process.env.OPENAI_API_KEY)
  );
}

export function shouldGenerateOnApprove(): boolean {
  return process.env.GENERATE_IMAGES_ON === "approve";
}

async function persistImage(
  generatedPostId: string,
  bytes: Buffer
): Promise<string> {
  await mkdir(PUBLIC_IMAGES_DIR, { recursive: true });
  const fileName = `${generatedPostId}.png`;
  await writeFile(path.join(PUBLIC_IMAGES_DIR, fileName), bytes);
  return `/media/images/${fileName}`;
}

async function fetchUrlToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function generateImageForPost(
  generatedPostId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!isImageGenerationEnabled()) {
    return { ok: false, error: "Image generation disabled" };
  }

  const post = await prisma.generatedPost.findUnique({
    where: { id: generatedPostId },
  });
  if (!post?.imagePrompt) {
    return { ok: false, error: "No image prompt" };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const size = (process.env.OPENAI_IMAGE_SIZE ?? "1024x1024") as
    | "1024x1024"
    | "1024x1536"
    | "1024x1792"
    | "1536x1024"
    | "1792x1024";

  try {
    const response = await client.images.generate({
      model,
      prompt: post.imagePrompt.slice(0, 4000),
      n: 1,
      size,
    });

    const item = response.data?.[0];
    if (!item) return { ok: false, error: "No image returned" };

    let bytes: Buffer;
    if (item.b64_json) {
      bytes = Buffer.from(item.b64_json, "base64");
    } else if (item.url) {
      bytes = await fetchUrlToBuffer(item.url);
    } else {
      return { ok: false, error: "Image response had no b64_json or url" };
    }

    const publicUrl = await persistImage(generatedPostId, bytes);

    await prisma.generatedPost.update({
      where: { id: generatedPostId },
      data: { mediaUrl: publicUrl },
    });

    await prisma.mediaAsset.create({
      data: {
        generatedPostId,
        assetType: "image",
        url: publicUrl,
        prompt: post.imagePrompt,
        status: "generated",
      },
    });

    return { ok: true, url: publicUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Image generation failed";
    await prisma.publishLog.create({
      data: {
        generatedPostId,
        platform: post.platform,
        action: "image_generate",
        status: "failed",
        message: msg,
      },
    });
    return { ok: false, error: msg };
  }
}

export async function generateImagesForRssPosts(
  postIds: string[],
  platforms: Platform[] = IMAGE_PLATFORMS
): Promise<void> {
  if (!isImageGenerationEnabled() || shouldGenerateOnApprove()) return;

  for (const id of postIds) {
    const post = await prisma.generatedPost.findUnique({ where: { id } });
    if (post && platforms.includes(post.platform)) {
      await generateImageForPost(id);
    }
  }
}
