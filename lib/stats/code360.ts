import {
  REQUEST_TIMEOUT_MS,
  type ActivityDay,
  type Badge,
  type Code360Stats,
} from "./types";

const BASE = "https://www.naukri.com/code360/api/v3/public_section";

/** Nothing on the platform predates this; it just has to be early. */
const HISTORY_START = "2018-01-01";

/**
 * Per-day contributions. Code360 does not advertise this, but the
 * profile page's own heatmap is driven by it and it needs no auth — the
 * only requirement is an explicit date range, which is why a bare call
 * returns "Date is required".
 *
 * Fetched separately from the profile so a failure here costs the
 * heatmap contribution and nothing else.
 */
async function getContributions(uuid: string): Promise<ActivityDay[]> {
  try {
    /**
     * `end_date` is **exclusive**, which is not what the parameter name
     * suggests and is not documented anywhere. Passing today's date
     * therefore returned everything up to yesterday, so Code360's
     * contribution to the heatmap was permanently a day behind — and on
     * a day when Code360 was the only judge worked on, the heatmap read
     * zero. Verified directly against the endpoint:
     *
     *   end_date=2026-09-08 -> ["2026-09-07"]
     *   end_date=2026-09-09 -> ["2026-09-07", "2026-09-08"]
     *
     * Two days rather than one. One would fix the exclusive bound, but
     * Code360 is an Indian platform and appears to bucket by IST, which
     * runs up to a day *ahead* of UTC between 18:30 and midnight UTC —
     * so a single day of slack would still miss late-evening work. A
     * date past the end of the data costs nothing: the endpoint returns
     * the same map for any later bound.
     */
    const end = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const res = await fetch(
      `${BASE}/profile/contributions?uuid=${encodeURIComponent(uuid)}&start_date=${HISTORY_START}&end_date=${end}`,
      {
        headers: {
          "User-Agent": "shubham-portfolio",
          Accept: "application/json",
        },
        cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
    if (!res.ok) return [];

    const body = (await res.json()) as {
      data?: { contribution_map?: Record<string, { total?: number }> };
    };
    const map = body.data?.contribution_map ?? {};

    return Object.entries(map)
      .map(([date, v]) => ({ date, count: Number(v?.total) || 0 }))
      .filter((d) => d.count > 0);
  } catch {
    return [];
  }
}

/**
 * Naukri Code360 (formerly Coding Ninjas Studio). Its profile page is
 * backed by a public JSON endpoint that needs no auth — the same one the
 * page itself calls — so this is a real API read rather than a scrape.
 *
 * The profile is addressed by UUID, not by handle.
 */
interface Code360Response {
  data?: {
    name?: string;
    user_level_name?: string | null;
    user_exp?: number | null;
    dsa_domain_data?: {
      problem_count_data?: {
        total_count?: number;
        difficulty_data?: { level: string; count: number }[];
      };
      /** tier -> { ptm | gp | sgp } -> topic names */
      badges_hash?: Record<string, Record<string, string[]>>;
    };
  };
}

export async function getCode360(uuid: string): Promise<Code360Stats | null> {
  try {
    const res = await fetch(
      `https://www.naukri.com/code360/api/v3/public_section/profile/user_details?uuid=${encodeURIComponent(uuid)}`,
      {
        headers: {
          "User-Agent": "shubham-portfolio",
          Accept: "application/json",
        },
        cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
    if (!res.ok) throw new Error(`Code360: HTTP ${res.status}`);

    const [body, activity] = await Promise.all([
      res.json() as Promise<Code360Response>,
      getContributions(uuid),
    ]);
    const counts = body.data?.dsa_domain_data?.problem_count_data;
    if (!counts) throw new Error("Code360: no DSA data");

    const byLevel = (level: string): number =>
      counts.difficulty_data?.find((d) => d.level === level)?.count ?? 0;

    // Badges arrive grouped by tier and then by track; the topic name is
    // the badge, the tier is its level.
    const badges: Badge[] = [];
    const hash = body.data?.dsa_domain_data?.badges_hash ?? {};
    for (const [tier, tracks] of Object.entries(hash)) {
      for (const topics of Object.values(tracks ?? {})) {
        for (const topic of topics ?? []) {
          badges.push({
            name: topic,
            platform: "Code360",
            date: null,
            tier: tier.charAt(0).toUpperCase() + tier.slice(1),
          });
        }
      }
    }

    return {
      uuid,
      solved: counts.total_count ?? 0,
      easy: byLevel("Easy"),
      // Code360 calls the middle band "Moderate" rather than "Medium".
      medium: byLevel("Moderate"),
      hard: byLevel("Hard"),
      ninja: byLevel("Ninja"),
      level: body.data?.user_level_name ?? null,
      experience: body.data?.user_exp ?? null,
      badges,
      activity,
    };
  } catch {
    return null;
  }
}
