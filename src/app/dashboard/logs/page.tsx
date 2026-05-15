import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function LogsPage() {
  const [ingest, publish, webhooks] = await Promise.all([
    prisma.ingestLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.publishLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.makeWebhookLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Logs</h1>
        <p className="text-zinc-400">Ingest, AI generation, publishing, and webhook activity</p>
      </header>

      <LogSection title="RSS ingest" entries={ingest.map((l) => ({
        id: l.id,
        time: l.createdAt,
        status: l.status,
        message: `${l.action}: ${l.message ?? ""}`,
      }))} />

      <LogSection title="Publishing" entries={publish.map((l) => ({
        id: l.id,
        time: l.createdAt,
        status: l.status,
        message: `${l.action} (${l.platform ?? "—"}): ${l.message ?? ""}`,
      }))} />

      <LogSection title="Make.com webhooks" entries={webhooks.map((l) => ({
        id: l.id,
        time: l.createdAt,
        status: l.statusCode ? String(l.statusCode) : l.error ? "error" : "ok",
        message: `${l.method} ${l.endpoint}${l.error ? ` — ${l.error}` : ""}`,
      }))} />
    </div>
  );
}

function LogSection({
  title,
  entries,
}: {
  title: string;
  entries: { id: string; time: Date; status: string; message: string }[];
}) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-zinc-500">No logs yet.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex gap-3 border-b border-zinc-800/50 py-2">
              <span className="shrink-0 text-xs text-zinc-600">
                {e.time.toLocaleString()}
              </span>
              <Badge variant={e.status.includes("fail") || e.status === "error" ? "danger" : "default"}>
                {e.status}
              </Badge>
              <span className="text-zinc-400">{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
