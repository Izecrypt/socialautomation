import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const [sources, rssNew, queued, generated, approved] = await Promise.all([
    prisma.source.count(),
    prisma.rssItem.count({ where: { status: "new" } }),
    prisma.rssItem.count({ where: { status: "queued" } }),
    prisma.generatedPost.count(),
    prisma.generatedPost.count({ where: { status: "approved" } }),
  ]);

  const recentItems = await prisma.rssItem.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-zinc-400">Crypto AI RSS Social Automation</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Sources", value: sources },
          { label: "New items", value: rssNew },
          { label: "Queued", value: queued },
          { label: "Generated posts", value: generated },
          { label: "Approved", value: approved },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-violet-400">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Recent RSS items</h2>
        {recentItems.length === 0 ? (
          <p className="text-zinc-500">No items yet. Add sources or connect Make.com webhook.</p>
        ) : (
          <ul className="space-y-3">
            {recentItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-zinc-500">
                    {item.sourceName} · score {item.relevanceScore}
                  </p>
                </div>
                <Badge variant={item.status === "queued" ? "success" : "default"}>
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
