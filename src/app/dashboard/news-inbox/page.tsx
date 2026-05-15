import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  triggerGenerate,
  updateRssItemStatus,
} from "@/app/actions/dashboard";

export default async function NewsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const items = await prisma.rssItem.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">News Inbox</h1>
        <p className="text-zinc-400">RSS items with relevance scoring</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {["", "new", "queued", "ignored", "duplicate", "generated"].map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/dashboard/news-inbox?status=${s}` : "/dashboard/news-inbox"}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-900"
          >
            {s || "all"}
          </Link>
        ))}
      </div>

      <Card>
        {items.length === 0 ? (
          <p className="text-zinc-500">No RSS items. Use Make.com webhook or internal fetcher.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <a
                      href={item.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-violet-300 hover:underline"
                    >
                      {item.title}
                    </a>
                    <p className="mt-1 text-sm text-zinc-500">
                      {item.sourceName} · score {item.relevanceScore} ·{" "}
                      {item.createdAt.toLocaleString()}
                    </p>
                    {item.detectedKeywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.detectedKeywords.slice(0, 8).map((kw) => (
                          <Badge key={kw} variant="info">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {item.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{item.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={item.status === "queued" ? "success" : "default"}>
                      {item.status}
                    </Badge>
                    <div className="flex gap-2">
                      <form action={updateRssItemStatus.bind(null, item.id, "queued")}>
                        <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                          Queue
                        </Button>
                      </form>
                      <form action={updateRssItemStatus.bind(null, item.id, "ignored")}>
                        <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                          Ignore
                        </Button>
                      </form>
                      <form action={triggerGenerate.bind(null, item.id)}>
                        <Button type="submit" className="px-2 py-1 text-xs">
                          Generate
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
