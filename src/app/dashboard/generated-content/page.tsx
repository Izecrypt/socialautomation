import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  approvePost,
  rejectPost,
  triggerRiskCheck,
} from "@/app/actions/dashboard";
import { PostEditor } from "@/components/posts/post-editor";

export default async function GeneratedContentPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; status?: string }>;
}) {
  const { platform, status } = await searchParams;
  const posts = await prisma.generatedPost.findMany({
    where: {
      ...(platform ? { platform: platform as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: { rssItem: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const platforms = ["x", "telegram", "instagram", "tiktok", "youtube_shorts"];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Generated Content</h1>
        <p className="text-zinc-400">Review and approve AI-generated posts</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/generated-content" className="rounded-lg border border-zinc-700 px-3 py-1 text-sm">
          all platforms
        </Link>
        {platforms.map((p) => (
          <Link
            key={p}
            href={`/dashboard/generated-content?platform=${p}`}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-900"
          >
            {p}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <Card>
          <p className="text-zinc-500">No generated posts. Queue RSS items and run Generate.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Badge variant="info">{post.platform}</Badge>
                  <Badge
                    variant={
                      post.riskScore === "high"
                        ? "danger"
                        : post.riskScore === "medium"
                          ? "warning"
                          : "success"
                    }
                  >
                    risk: {post.riskScore}
                  </Badge>
                  <Badge>{post.status}</Badge>
                </div>
                <span className="text-xs text-zinc-500">{post.createdAt.toLocaleString()}</span>
              </div>

              {post.hook && <p className="mb-2 text-sm font-semibold text-violet-300">{post.hook}</p>}

              <PostEditor
                postId={post.id}
                contentText={post.contentText}
                hook={post.hook ?? ""}
              />

              <p className="mt-2 text-xs text-zinc-500">
                Source:{" "}
                <a href={post.rssItem.articleUrl} className="text-violet-400 hover:underline">
                  {post.rssItem.title}
                </a>
              </p>

              {post.imagePrompt && (
                <p className="mt-2 rounded bg-zinc-950 p-2 text-xs text-zinc-400">
                  Image prompt: {post.imagePrompt}
                </p>
              )}

              {post.safetyNotes.length > 0 && (
                <p className="mt-2 text-xs text-amber-400">
                  Safety: {post.safetyNotes.join("; ")}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={approvePost.bind(null, post.id)}>
                  <Button type="submit" className="px-3 py-1 text-xs">
                    Approve
                  </Button>
                </form>
                <form action={rejectPost.bind(null, post.id)}>
                  <Button type="submit" variant="danger" className="px-3 py-1 text-xs">
                    Reject
                  </Button>
                </form>
                <form action={triggerRiskCheck.bind(null, post.id)}>
                  <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
                    Risk check
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
