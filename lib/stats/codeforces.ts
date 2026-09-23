import { toLocalDate } from "./activity";
import {
  CODEFORCES_BUDGET_MS,
  REQUEST_TIMEOUT_MS,
  type ActivityDay,
  type CodeforcesStats,
  type RatingPoint,
} from "./types";

const API = "https://codeforces.com/api";

interface CfEnvelope<T> {
  status: string;
  result: T;
}

interface CfUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
}

interface CfRatingChange {
  contestName: string;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

interface CfSubmission {
  verdict?: string;
  creationTimeSeconds: number;
  problem: { contestId?: number; index: string; name: string };
}

/** Codeforces allows roughly one call every two seconds. */
const pause = (ms = 2100) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One endpoint, retried at most once, inside a shared time budget.
 *
 * Codeforces returns intermittent 504s and — worse — sometimes simply
 * stalls. Retrying used to be worth almost any delay, because losing this
 * platform meant losing the rating chart and the live achievement line
 * entirely. That is no longer true: the snapshot carries the previous
 * reading forward and labels it, so the honest trade now is to give up
 * quickly and let the stored value stand rather than to hold the whole
 * refresh open. Resolves to null instead of throwing, so one dead
 * endpoint does not cost the two that answered.
 */
async function soft<T>(path: string, deadline: number): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    if (Date.now() >= deadline) return null;
    try {
      return await cfOnce<T>(path);
    } catch {
      // Retry only if the budget can still fit the mandated pause and
      // another full request; otherwise stop rather than burn the time.
      if (attempt >= 1) return null;
      if (Date.now() + 2100 + REQUEST_TIMEOUT_MS > deadline) return null;
      await pause();
    }
  }
}

async function cfOnce<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    // Never cached: this runs only in the background refresh, whose
    // whole job is to see the platform's current state. Fallback is the
    // stored snapshot's business, not the HTTP layer's.
    cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "User-Agent": "shubham-portfolio" },
  });
  if (!res.ok) throw new Error(`Codeforces ${path}: HTTP ${res.status}`);
  const body = (await res.json()) as CfEnvelope<T>;
  if (body.status !== "OK") throw new Error(`Codeforces ${path}: not OK`);
  return body.result;
}

export async function getCodeforces(
  handle: string
): Promise<CodeforcesStats | null> {
  // Sequential, spaced, and deliberately not Promise.all: Codeforces
  // documents a limit of one request every two seconds, and firing
  // these three together reliably draws 504s.
  //
  // Each endpoint can also fail on its own. Rather than losing the whole
  // platform to one bad call, whatever came back is used and the rest is
  // left null for the snapshot merge to fill in from the last good read.
  //
  // The shared deadline is what keeps a stall from becoming a function
  // timeout. The pauses stay unconditional so the rate limit is honoured
  // even on the run where we are about to give up.
  const deadline = Date.now() + CODEFORCES_BUDGET_MS;

  const users = await soft<CfUser[]>(
    `user.info?handles=${encodeURIComponent(handle)}`,
    deadline
  );
  await pause();
  const changes = await soft<CfRatingChange[]>(
    `user.rating?handle=${encodeURIComponent(handle)}`,
    deadline
  );
  await pause();
  const submissions = await soft<CfSubmission[]>(
    `user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`,
    deadline
  );

  // Nothing at all came back: Codeforces is down, not merely flaky.
  if (!users && !changes && !submissions) return null;

  const user = users?.[0] ?? null;

  // A problem can be solved more than once; count distinct problems.
  const solvedKeys = new Set<string>();
  for (const s of submissions ?? []) {
    if (s.verdict !== "OK") continue;
    solvedKeys.add(`${s.problem.contestId ?? "x"}-${s.problem.index}`);
  }

  // Every submission day, not only solved ones: "active" means the day
  // was worked, which is what the heatmap and streaks describe.
  const perDay = new Map<string, number>();
  for (const sub of submissions ?? []) {
    if (!sub.creationTimeSeconds) continue;
    // Bucketed in IST rather than UTC — see toLocalDate.
    const date = toLocalDate(sub.creationTimeSeconds);
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
  }
  const activity: ActivityDay[] = [...perDay.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  const history: RatingPoint[] = (changes ?? []).map((c) => ({
    t: c.ratingUpdateTimeSeconds,
    rating: c.newRating,
    label: c.contestName,
  }));

  return {
    handle: user?.handle ?? handle,
    rating: user?.rating ?? null,
    maxRating: user?.maxRating ?? null,
    rank: user?.rank ?? null,
    maxRank: user?.maxRank ?? null,
    contests: changes?.length ?? 0,
    solved: solvedKeys.size,
    history,
    activity,
  };
}
