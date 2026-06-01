/** Sync dashboard stats filters to the URL without triggering Next.js navigation. */
export function syncStatsUrl(params: Record<string, string | undefined>) {
  if (typeof window === "undefined") return;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}
