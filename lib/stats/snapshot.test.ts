import { mergeSnapshot, emptySnapshot, type FetchedPlatforms } from "./snapshot";
import type { StatsSnapshot } from "./types";

/**
 * Merge rules for the last-known-good snapshot.
 *
 * These are the cases that decide whether the site shows an honest
 * number, a stale one, or a wrong one, and none of them are reachable by
 * looking at the live site — they need a platform to be down, or to have
 * changed its markup, at the moment you happen to look. So they are
 * exercised here against fabricated snapshots instead.
 *
 * Run with `npm run test:stats`. No framework: it is a script that exits
 * non-zero if any assertion fails.
 */

let failures = 0;
function check(name: string, condition: boolean): void {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
}

const down = { value: null, error: "down" };

function fetched(overrides: Partial<FetchedPlatforms>): FetchedPlatforms {
  return {
    codeforces: down,
    leetcode: down,
    codechef: down,
    code360: down,
    github: down,
    ...overrides,
  } as FetchedPlatforms;
}

const ok = <T,>(value: T) => ({ value, error: null });

const DAY = 86_400_000;
const t0 = Date.parse("2026-09-01T00:00:00.000Z");

const cf = {
  handle: "shubham2927",
  rating: 1200,
  maxRating: 1250,
  rank: "pupil",
  maxRank: "pupil",
  contests: 12,
  solved: 300,
  history: [{ t: 1, rating: 1200, label: "A" }],
  activity: [{ date: "2026-08-01", count: 3 }],
};

const gh = {
  login: "x",
  contributions: 1,
  totalContributions: 10,
  activeDays: 1,
  totalActiveDays: 5,
  currentStreak: 1,
  longestStreak: 3,
  publicRepos: 2,
  followers: 1,
  stars: 34,
  forks: 0,
  commits: 638,
  pullRequests: 31,
  issues: 3,
  languages: [{ name: "TypeScript", bytes: 100, share: 100 }],
  languagesExact: true,
  languagesAt: new Date(t0).toISOString(),
  createdYear: 2024,
};

// A first successful read is stored verbatim.
const first = mergeSnapshot(
  null,
  fetched({ codeforces: ok(cf as never) }),
  t0
);
check("a fresh read is stored", first.platforms.codeforces?.rating === 1200);
check("a fresh read is not marked stale", first.meta.codeforces?.stale === false);

// Total outage: the reading survives, labelled with its original date.
const outage = mergeSnapshot(first, fetched({}), t0 + 1_800_000);
check("an outage carries the value forward", outage.platforms.codeforces?.rating === 1200);
check("an outage marks it stale", outage.meta.codeforces?.stale === true);
check(
  "an outage keeps the ORIGINAL timestamp",
  outage.meta.codeforces?.updatedAt === new Date(t0).toISOString()
);
check("an outage records the reason", outage.meta.codeforces?.error === "down");

// Partial response: Codeforces' three endpoints fail independently.
const partial = mergeSnapshot(
  first,
  fetched({
    codeforces: ok({
      ...cf,
      rating: null,
      maxRating: null,
      rank: null,
      maxRank: null,
      contests: 13,
      solved: 0,
      history: [
        { t: 1, rating: 1200, label: "A" },
        { t: 2, rating: 1240, label: "B" },
      ],
      activity: [{ date: "2026-08-02", count: 5 }],
    } as never),
  }),
  t0 + DAY
);
check("a null rating does not erase a known rating", partial.platforms.codeforces?.rating === 1200);
check("a null peak does not erase a known peak", partial.platforms.codeforces?.maxRating === 1250);
check("the half that answered still updates", partial.platforms.codeforces?.history.length === 2);
check("contests still increments", partial.platforms.codeforces?.contests === 13);
check("solved cannot drop to zero", partial.platforms.codeforces?.solved === 300);
check("activity days are unioned", partial.platforms.codeforces?.activity.length === 2);
check("a partial read still counts as fresh", partial.meta.codeforces?.stale === false);

// A parser that silently starts reading the wrong element.
const regressed = mergeSnapshot(
  first,
  fetched({ codeforces: ok({ ...cf, solved: 4, maxRating: 800, history: [], contests: 0 } as never) }),
  t0 + DAY
);
check("solved cannot go backwards", regressed.platforms.codeforces?.solved === 300);
check("peak rating cannot go backwards", regressed.platforms.codeforces?.maxRating === 1250);
check("an emptied history is rejected", regressed.platforms.codeforces?.history.length === 1);

// A real rating drop must still be allowed through.
const dropped = mergeSnapshot(
  first,
  fetched({ codeforces: ok({ ...cf, rating: 1100 } as never) }),
  t0 + DAY
);
check("current rating is allowed to fall", dropped.platforms.codeforces?.rating === 1100);
check("a fall does not touch the peak", dropped.platforms.codeforces?.maxRating === 1250);

// The staleness horizon, and that repeated failures do not slide it.
check(
  "still carried forward at 20 days",
  mergeSnapshot(first, fetched({}), t0 + 20 * DAY).platforms.codeforces !== null
);
const expired = mergeSnapshot(first, fetched({}), t0 + 22 * DAY);
check("dropped past the 21-day horizon", expired.platforms.codeforces === null);
check("an expired platform still reports as stale", expired.meta.codeforces?.stale === true);

let chain = first;
for (let i = 1; i <= 30; i++) chain = mergeSnapshot(chain, fetched({}), t0 + i * DAY);
check("repeated outages do not slide the horizon", chain.platforms.codeforces === null);

// The language pass runs on its own slower clock, so most refreshes
// legitimately return none. That is a skip, not a loss.
const withGh = mergeSnapshot(null, fetched({ github: ok(gh as never) }), t0);
const skipped = mergeSnapshot(
  withGh,
  fetched({
    github: ok({
      ...gh,
      languages: [],
      languagesExact: false,
      languagesAt: null,
      commits: null,
    } as never),
  }),
  t0 + 1_800_000
);
check("a skipped language pass keeps the languages", skipped.platforms.github?.languages.length === 1);
check("a skipped language pass keeps the exact flag", skipped.platforms.github?.languagesExact === true);
check("a rate-limited commit count keeps its value", skipped.platforms.github?.commits === 638);

// One platform failing must not touch the others.
const mixed = mergeSnapshot(
  mergeSnapshot(null, fetched({ codeforces: ok(cf as never), github: ok(gh as never) }), t0),
  fetched({ github: ok(gh as never) }),
  t0 + 1_800_000
);
check("the healthy platform stays fresh", mixed.meta.github?.stale === false);
check("only the platform that failed is stale", mixed.meta.codeforces?.stale === true);

// A stored snapshot in an older format is discarded, not trusted.
const oldFormat = {
  ...emptySnapshot(),
  version: 1,
  platforms: { ...emptySnapshot().platforms, codeforces: cf as never },
} as StatsSnapshot;
check(
  "an old snapshot format is discarded, not trusted",
  mergeSnapshot(oldFormat, fetched({}), t0).platforms.codeforces === null
);

console.log(failures === 0 ? "\nall merge rules hold" : `\n${failures} failing`);
process.exit(failures === 0 ? 0 : 1);
