import { prisma } from "@/lib/db";
import { SOURCE_CATEGORIES } from "@/lib/constants/categories";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createSource,
  deleteSource,
  toggleSourceStatus,
} from "@/app/actions/dashboard";

export default async function NewsSourcesPage() {
  const sources = await prisma.source.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">News Sources</h1>
        <p className="text-zinc-400">Manage RSS feeds and monitoring rules</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Add source</h2>
        <form action={createSource} className="grid gap-4 md:grid-cols-2">
          <input
            name="name"
            placeholder="Source name"
            required
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            name="feedUrl"
            type="url"
            placeholder="RSS feed URL"
            required
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <select name="category" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
            {SOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="priority" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            name="checkFrequency"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="mins_5">5 mins</option>
            <option value="mins_15">15 mins</option>
            <option value="mins_30">30 mins</option>
            <option value="mins_60">60 mins</option>
          </select>
          <input type="hidden" name="status" value="active" />
          <input
            name="keywords"
            placeholder="Keywords (comma-separated)"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            name="excludedKeywords"
            placeholder="Excluded keywords"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <Button type="submit" className="md:col-span-2">
            Add source
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Sources ({sources.length})</h2>
        {sources.length === 0 ? (
          <p className="text-zinc-500">
            No sources yet. Run <code className="text-violet-400">npm run db:seed</code> for defaults.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Priority</th>
                  <th className="pb-2 pr-4">Frequency</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{s.name}</p>
                      <p className="max-w-xs truncate text-xs text-zinc-500">{s.feedUrl}</p>
                    </td>
                    <td className="py-3 pr-4">{s.category}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={s.priority === "high" ? "warning" : "default"}>
                        {s.priority}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{s.checkFrequency.replace("mins_", "")}m</td>
                    <td className="py-3 pr-4">
                      <Badge variant={s.status === "active" ? "success" : "default"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <form
                          action={toggleSourceStatus.bind(
                            null,
                            s.id,
                            s.status === "active" ? "paused" : "active"
                          )}
                        >
                          <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                            {s.status === "active" ? "Pause" : "Resume"}
                          </Button>
                        </form>
                        <form action={deleteSource.bind(null, s.id)}>
                          <Button type="submit" variant="danger" className="px-2 py-1 text-xs">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
