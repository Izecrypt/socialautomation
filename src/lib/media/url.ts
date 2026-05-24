export function toAbsoluteUrl(
  pathOrUrl: string | null | undefined
): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return base ? `${base}${normalized}` : normalized;
}
