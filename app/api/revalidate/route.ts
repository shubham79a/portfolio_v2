import { revalidatePath } from "next/cache";
import { NextResponse, after } from "next/server";
import {
  refreshStats,
  STATS_REFRESH_SECONDS,
  WARM_TIMEOUT_MS,
} from "@/lib/stats";

/**
 * The scheduled refresh. This is the only thing on the site that talks to
 * Codeforces, LeetCode, CodeChef, Code360 or GitHub.
 *
 * The order matters. First the platforms are read and reconciled against
 * the stored snapshot, so whatever answered is updated and whatever
 * didn't keeps its previous reading. Only then are the pages purged and
 * rebuilt, against a snapshot that is already correct.
 *
 * Because the pages no longer fetch anything themselves, there is no
 * coupling between this schedule and any response TTL — the cron can run
 * as often as makes sense without re-rendering against cached upstream
 * responses.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PATHS = ["/", "/stats"] as const;

export async function GET(request: Request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the env
  // var is set. Setting one matters: this route performs writes and
  // spends a rate-limit budget, so it should not be freely triggerable.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const { report } = await refreshStats();

  for (const path of PATHS) revalidatePath(path, "page");

  /**
   * Rebuilding the pages here rather than lazily matters: ISR
   * revalidation is traffic-driven, so left alone the first visitor after
   * a purge is served the *stale* page and merely triggers a
   * regeneration for whoever comes next. On a low-traffic site that
   * first visitor is very often the only visitor.
   *
   * But the caller must not wait for it. Measured locally, the data
   * itself was stored in a few seconds while rebuilding both pages took
   * a further ~110s — well past this function's 60s ceiling. Blocking on
   * it would have meant a timeout, a red workflow run and an alert email
   * every thirty minutes, all while the data was in fact saved
   * correctly. `after()` runs this once the response has already been
   * sent, so the schedule reports honestly on the thing it is actually
   * responsible for. If the rebuild is cut short, the pages still
   * regenerate on their own via the segment `revalidate`.
   */
  const origin = new URL(request.url).origin;
  after(async () => {
    await Promise.all(
      PATHS.map(async (path) => {
        try {
          await fetch(`${origin}${path}`, {
            cache: "no-store",
            signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
          });
        } catch {
          // Nothing to do: the page is already marked for regeneration.
        }
      })
    );
  });

  /**
   * A deployment that cannot see its KV credentials falls back to a
   * per-instance variable that the renderer never reads. Everything
   * still *looks* right — pages build, numbers are current, this route
   * returns cleanly — but the last-known-good carry-forward silently
   * does nothing, and you would only discover that on the day a platform
   * went down, which is the worst possible time to discover it.
   *
   * So it is reported as a failure. The workflow that calls this route
   * checks the status code, so a misconfigured deploy turns into a red
   * run and an email instead of a lie.
   *
   * Only the misconfiguration is treated this way. A transient write
   * failure against a healthy configuration is left as a success with
   * `stored: false` in the body: it self-heals on the next run, and
   * paging someone every thirty minutes through a brief Upstash blip
   * would train them to ignore the alert.
   */
  const misconfigured = Boolean(process.env.VERCEL) && report.driver === "memory";

  return NextResponse.json(
    {
      ok: !misconfigured,
      ...(misconfigured
        ? {
            error:
              "No KV credentials visible in production. Set KV_REST_API_URL and " +
              "KV_REST_API_TOKEN in the Vercel project and redeploy — until then " +
              "the last-known-good snapshot is not persisted between instances.",
          }
        : {}),
      refreshSeconds: STATS_REFRESH_SECONDS,
      ...report,
      revalidated: PATHS,
      at: new Date().toISOString(),
    },
    { status: misconfigured ? 500 : 200 }
  );
}
