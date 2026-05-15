import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { runRiskCheck } from "@/lib/ai/generator";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ generatedPostId: string }> }
) {
  const { generatedPostId } = await params;

  try {
    const post = await prisma.generatedPost.findUnique({
      where: { id: generatedPostId },
    });
    if (!post) return jsonError("Generated post not found", 404);

    const result = await runRiskCheck(generatedPostId);
    return jsonOk(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Risk check failed";
    return jsonError(msg, 500);
  }
}
