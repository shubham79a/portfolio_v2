/**
 * Cloudflare Worker: the site's half-hourly clock.
 *
 * This is the only thing that makes the stats refresh happen on time.
 * It holds no data and no logic of its own — it calls
 * /api/revalidate on the site and that endpoint does all the real work
 * (fetch five platforms, reconcile against the last-known-good
 * snapshot, write it to Upstash, rebuild the two pages).
 *
 * Why Cloudflare and not somewhere closer to the app:
 *   - Vercel Hobby rejects any cron that fires more than once a day.
 *   - GitHub Actions' `schedule` event was observed being *dropped*,
 *     not merely delayed — roughly 2 runs fired in 7 hours.
 *   - Vercel is serverless, so the app itself has no always-on process
 *     that could hold a 30-minute timer.
 *
 * Cost shape: awaiting a fetch is wall-clock time, not CPU time, so a
 * slow platform upstream costs nothing against the free plan's CPU
 * budget. This runs 48 times a day.
 *
 * Deployed from the Cloudflare dashboard. The variables live there, not
 * here — see worker/README.md.
 */
export default {
  /** The scheduled job. This is what the cron trigger invokes. */
  async scheduled(event, env, ctx) {
    await refresh(env);
  },

  /**
   * Manual test hook, so the worker can be proven without waiting for
   * the next tick. Requires the key, so the public workers.dev URL is
   * not a free way for anyone to spend the site's API rate limit.
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.searchParams.get("key") !== env.CRON_SECRET) {
      return new Response("unauthorized", { status: 401 });
    }
    const { status, body } = await refresh(env);
    return new Response(body, {
      status,
      headers: { "content-type": "application/json" },
    });
  },
};

async function refresh(env) {
  const res = await fetch(`${env.SITE_URL}/api/revalidate`, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body = await res.text();
  // Surfaces in the Worker's Logs / Observability tab, so a 500 is
  // visible if you go looking. Cloudflare will not email you about it —
  // that is what the daily GitHub Actions canary is for.
  console.log("refresh", res.status, body.slice(0, 500));
  return { status: res.status, body };
}
