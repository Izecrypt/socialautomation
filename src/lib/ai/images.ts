import OpenAI from "openai";
import { prisma } from "@/lib/db";
import type { Platform } from "@/generated/prisma/client";

const IMAGE_PLATFORMS: Platform[] = ["x", "telegram", "instagram"];

export function isImageGenerationEnabled(): boolean {
  return (
    process.env.IMAGE_GENERATION_ENABLED === "true" &&
    Boolean(process.env.OPENAI_API_KEY)
  );
}

export function shouldGenerateOnApprove(): boolean {
  return process.env.GENERATE_IMAGES_ON === "approve";
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
  const model = process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";

  try {
    const response = await client.images.generate({
      model,
      prompt: post.imagePrompt.slice(0, 4000),
      n: 1,
      size: "1024x1024",
    });

    const url = response.data?.[0]?.url;
    if (!url) {
      return { ok: false, error: "No image URL returned" };
    }

    await prisma.generatedPost.update({
      where: { id: generatedPostId },
      data: { mediaUrl: url },
    });

    await prisma.mediaAsset.create({
      data: {
        generatedPostId,
        assetType: "image",
        url,
        prompt: post.imagePrompt,
        status: "generated",
      },
    });

    return { ok: true, url };
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
