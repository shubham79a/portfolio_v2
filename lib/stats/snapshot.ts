import {
  SNAPSHOT_VERSION,
  STALE_LIMIT_DAYS,
  type ActivityDay,
  type PlatformData,
  type PlatformKey,
  type StatsSnapshot,
} from "./types";

/**
 * Reconciling a fresh read against the last-known-good record.
 *
 * The rule is simple to state: a platform that answers replaces its own
 * entry, and a platform that doesn't keeps the one it had. Everything
 * below is the qualifications on that rule, and each exists because the
 * naive version would eventually show a wrong number.
 */

export type FetchedPlatforms = {
  [K in PlatformKey]: { value: PlatformData[K] | null; error: string | null };
};

export const PLATFORM_KEYS: readonly PlatformKey[] = [
  "codeforces",
  "leetcode",
  "codechef",
  "code360",
  "github",
] as const;

export function emptySnapshot(): StatsSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    platforms: {
      codeforces: null,
      leetcode: null,
      codechef: null,
      code360: null,
      github: null,
    },
    meta: {
      codeforces: null,
      leetcode: null,
      codechef: null,
      code360: null,
      github: null,
    },
    savedAt: new Date(0).toISOString(),
  };
}

/** A stored snapshot from an older format is discarded, not migrated. */
export function normalise(stored: StatsSnapshot | null): StatsSnapshot {
  if (!stored || stored.version !== SNAPSHOT_VERSION) return emptySnapshot();
  const base = emptySnapshot();
  return {
    version: SNAPSHOT_VERSION,
    platforms: { ...base.platforms, ...stored.platforms },
    meta: { ...base.meta, ...stored.meta },
    savedAt: stored.savedAt ?? base.savedAt,
  };
}

/**
 * Days are unioned and the larger count wins.
 *
 * Union rather than replace because a platform can narrow what it
 * reports — LeetCode's calendar only covers the years it considers
 * active, and CodeChef's profile page only ever showed a window. Without
 * this, a reading that legitimately returned fewer years would silently
 * erase history that was already counted, and "total active days" would
 * go *down* over time.
 */
function unionDays(previous: ActivityDay[], fresh: ActivityDay[]): ActivityDay[] {
  if (previous.length === 0) return fresh;
  const byDate = new Map<string, number>();
  for (const day of previous) byDate.set(day.date, day.count);
  for (const day of fresh) {
    byDate.set(day.date, Math.max(byDate.get(day.date) ?? 0, day.count));
  }
  return [...byDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Counters that only ever go up. A drop is not a real event — nobody
 * un-solves a problem — so it means the source changed shape and the
 * scrape or query now reads a different element. Holding the previous
 * value turns a silent wrong number into a stalled one, which is the
 * failure mode you can actually notice.
 *
 * Deliberately excluded: current rating, current streak, follower count,
 * CodeChef stars and the two trailing-12-month GitHub figures. Those can
 * all legitimately fall, and freezing them would be the bug.
 */
const MONOTONIC: { [K in PlatformKey]: readonly string[] } = {
  codeforces: ["maxRating", "contests", "solved"],
  leetcode: [
    "solved",
    "easy",
    "medium",
    "hard",
    "maxContestRating",
    "contestsAttended",
  ],
  codechef: ["maxRating", "solved", "contests"],
  code360: ["solved", "easy", "medium", "hard", "ninja", "experience"],
  github: [
    "totalContributions",
    "totalActiveDays",
    "longestStreak",
    "publicRepos",
    "stars",
    "forks",
    "commits",
    "pullRequests",
    "issues",
  ],
};

/**
 * Arrays that only grow: rating history, badges, topic tags. If a fresh
 * read comes back with fewer entries than we already had, the read is
 * partial rather than corrected, so the fuller version is kept.
 */
const APPEND_ONLY: { [K in PlatformKey]: readonly string[] } = {
  codeforces: ["history"],
  leetcode: ["history", "topics", "badges"],
  codechef: ["history", "badges"],
  code360: ["badges"],
  github: [],
};

type Row = Record<string, unknown>;

function reconcile<K extends PlatformKey>(
  key: K,
  fresh: PlatformData[K],
  previous: PlatformData[K] | null
): PlatformData[K] {
  if (!previous) return fresh;

  const merged: Row = { ...(fresh as unknown as Row) };
  const old = previous as unknown as Row;

  // A field that came back empty where we already had a value is a
  // partial response, not news. Codeforces answers each of its three
  // endpoints independently and any one of them can 504 on its own, so
  // a reading can arrive with a live rating history but no rank at all.
  // Nothing here ever legitimately reverts to unknown, so the previous
  // value stands.
  for (const [field, before] of Object.entries(old)) {
    if (before === null || before === undefined) continue;
    if (merged[field] === null || merged[field] === undefined) {
      merged[field] = before;
    }
  }

  for (const field of MONOTONIC[key]) {
    const next = merged[field];
    const before = old[field];
    if (typeof before !== "number") continue;
    if (typeof next !== "number" || next < before) merged[field] = before;
  }

  for (const field of APPEND_ONLY[key]) {
    const next = merged[field];
    const before = old[field];
    if (
      Array.isArray(before) &&
      (!Array.isArray(next) || next.length < before.length)
    ) {
      merged[field] = before;
    }
  }

  if ("activity" in merged) {
    merged.activity = unionDays(
      (old.activity as ActivityDay[]) ?? [],
      (merged.activity as ActivityDay[]) ?? []
    );
  }

  // The language pass runs on its own slower clock, so most refreshes
  // legitimately return no languages at all. That is a skip, not a loss.
  if (key === "github") {
    const next = merged.languages;
    if (!Array.isArray(next) || next.length === 0) {
      merged.languages = old.languages ?? [];
      merged.languagesExact = old.languagesExact ?? false;
      merged.languagesAt = old.languagesAt ?? null;
    }
  }

  return merged as unknown as PlatformData[K];
}

function ageInDays(iso: string, now: number): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return (now - then) / 86_400_000;
}

export function mergeSnapshot(
  stored: StatsSnapshot | null,
  fetched: FetchedPlatforms,
  now: number = Date.now()
): StatsSnapshot {
  const previous = normalise(stored);
  const nowIso = new Date(now).toISOString();
  const next = emptySnapshot();
  next.savedAt = nowIso;

  for (const key of PLATFORM_KEYS) {
    const result = fetched[key];
    const before = previous.platforms[key];
    const beforeMeta = previous.meta[key];

    if (result.value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next.platforms as any)[key] = reconcile(key, result.value as any, before as any);
      next.meta[key] = { updatedAt: nowIso, stale: false, error: null };
      continue;
    }

    // The platform did not answer. Carry the previous reading forward,
    // but only while it is recent enough to still be worth showing.
    if (before && beforeMeta) {
      if (ageInDays(beforeMeta.updatedAt, now) <= STALE_LIMIT_DAYS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (next.platforms as any)[key] = before as any;
        next.meta[key] = {
          updatedAt: beforeMeta.updatedAt,
          stale: true,
          error: result.error,
        };
        continue;
      }
    }

    next.platforms[key] = null;
    next.meta[key] = beforeMeta
      ? { updatedAt: beforeMeta.updatedAt, stale: true, error: result.error }
      : { updatedAt: nowIso, stale: true, error: result.error };
  }

  return next;
}
