import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { selectNextPost } from "@/lib/queue/selector";
import type { Platform } from "@/generated/prisma/client";

const PLATFORMS: Platform[] = ["x", "telegram", "instagram", "tiktok", "youtube_shorts"];

export default async function ContentQueuePage() {
  const [scheduled, approved, failed] = await Promise.all([
    prisma.generatedPost.findMany({
      where: { status: "scheduled" },
      include: { rssItem: true },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
    prisma.generatedPost.findMany({
      where: { status: "approved" },
      include: { rssItem: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.generatedPost.findMany({
      where: { status: "failed" },
      include: { rssItem: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const nextByPlatform = await Promise.all(
    PLATFORMS.map(async (p) => ({ platform: p, next: await selectNextPost(p) }))
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Content Queue</h1>
        <p className="text-zinc-400">Approved and scheduled posts for Make.com publishers</p>
      </header>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Next post per platform (preview)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {nextByPlatform.map(({ platform, next }) => (
            <div key={platform} className="rounded-lg border border-zinc-800 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="info">{platform}</Badge>
                {next ? <Badge variant="success">ready</Badge> : <Badge>empty</Badge>}
              </div>
              {next ? (
                <p className="line-clamp-2 text-sm text-zinc-300">{next.hook ?? next.contentText}</p>
              ) : (
                <p className="text-sm text-zinc-500">No eligible post</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Make.com calls GET /api/queue/next-post?platform=x with x-make-webhook-secret header.
        </p>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Scheduled ({scheduled.length})</h2>
        {scheduled.length === 0 ? (
          <p className="text-zinc-500">No scheduled posts.</p>
        ) : (
          <QueueList posts={scheduled} showTime />
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Approved ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="text-zinc-500">Approve posts from Generated Content.</p>
        ) : (
          <QueueList posts={approved} />
        )}
      </Card>

      {failed.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-red-400">Failed ({failed.length})</h2>
          <QueueList posts={failed} />
        </Card>
      )}
    </div>
  );
}

function QueueList({
  posts,
  showTime,
}: {
  posts: Array<{
    id: string;
    platform: string;
    hook: string | null;
    contentText: string;
    riskScore: string;
    scheduledAt: Date | null;
    rssItem: { title: string; sourceName: string };
  }>;
  showTime?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {posts.map((p) => (
        <li key={p.id} className="rounded border border-zinc-800 p-3 text-sm">
          <div className="flex gap-2">
            <Badge variant="info">{p.platform}</Badge>
            <Badge>{p.riskScore}</Badge>
          </div>
          <p className="mt-1 font-medium">{p.hook ?? p.contentText.slice(0, 80)}</p>
          <p className="text-xs text-zinc-500">
            {p.rssItem.sourceName}: {p.rssItem.title}
            {showTime && p.scheduledAt && ` · ${p.scheduledAt.toLocaleString()}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
