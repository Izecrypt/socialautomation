import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { fetchAllActiveSources } from "@/lib/rss/fetcher";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return jsonError("Unauthorized", 401);
  }

  const results = await fetchAllActiveSources();
  return jsonOk({ results });
}
