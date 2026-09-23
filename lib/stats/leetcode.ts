import {
  REQUEST_TIMEOUT_MS,
  type LeetCodeStats,
  type RatingPoint,
  type TopicCount,
  type Badge,
  type ActivityDay,
} from "./types";

const ENDPOINT = "https://leetcode.com/graphql";

/**
 * Public profile data only — no auth. The shape below matches what
 * leetcode.com's own profile page requests, which is why it has stayed
 * stable across the years the community wrappers have used it.
 */
const QUERY = `
  query profile($username: String!) {
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStatsGlobal { acSubmissionNum { difficulty count } }
      tagProblemCounts {
        advanced { tagName problemsSolved }
        intermediate { tagName problemsSolved }
        fundamental { tagName problemsSolved }
      }
      badges { displayName creationDate }
      userCalendar { activeYears }
    }
    userContestRanking(username: $username) {
      rating
      attendedContestsCount
      globalRanking
      topPercentage
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      ranking
      contest { title startTime }
    }
    allQuestionsCount { difficulty count }
  }
`;

interface DifficultyCount {
  difficulty: string;
  count: number;
}

interface TagCount {
  tagName: string;
  problemsSolved: number;
}

interface LeetCodeResponse {
  data?: {
    matchedUser: {
      username: string;
      profile: { ranking: number | null } | null;
      submitStatsGlobal: { acSubmissionNum: DifficultyCount[] } | null;
      tagProblemCounts: {
        advanced: TagCount[];
        intermediate: TagCount[];
        fundamental: TagCount[];
      } | null;
      badges: { displayName: string; creationDate: string | null }[] | null;
      userCalendar: { activeYears: number[] | null } | null;
    } | null;
    userContestRanking: {
      rating: number | null;
      attendedContestsCount: number | null;
      globalRanking: number | null;
      topPercentage: number | null;
    } | null;
    userContestRankingHistory:
      | {
          attended: boolean;
          rating: number;
          ranking: number | null;
          contest: { title: string; startTime: number };
        }[]
      | null;
    allQuestionsCount: DifficultyCount[] | null;
  };
  errors?: unknown;
}

const pick = (rows: DifficultyCount[] | undefined, key: string): number =>
  rows?.find((r) => r.difficulty === key)?.count ?? 0;

const CALENDAR_QUERY = `
  query calendar($username: String!, $year: Int) {
    matchedUser(username: $username) {
      userCalendar(year: $year) { submissionCalendar }
    }
  }
`;

/**
 * LeetCode reports its calendar one year at a time, so each active year
 * is a separate request. They run in parallel and are cached like every
 * other call, and a year that fails is simply skipped rather than
 * failing the platform.
 */
async function getYear(
  handle: string,
  year: number
): Promise<ActivityDay[]> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": "shubham-portfolio",
      },
      body: JSON.stringify({
        query: CALENDAR_QUERY,
        variables: { username: handle, year },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      data?: {
        matchedUser: {
          userCalendar: { submissionCalendar: string | null } | null;
        } | null;
      };
    };
    const raw = body.data?.matchedUser?.userCalendar?.submissionCalendar;
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, number>;
    return Object.entries(map).map(([ts, count]) => ({
      date: new Date(Number(ts) * 1000).toISOString().slice(0, 10),
      count,
    }));
  } catch {
    return [];
  }
}

export async function getLeetCode(
  handle: string
): Promise<LeetCodeStats | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // LeetCode rejects requests without a browser-ish referer.
        Referer: "https://leetcode.com",
        "User-Agent": "shubham-portfolio",
      },
      body: JSON.stringify({ query: QUERY, variables: { username: handle } }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`LeetCode: HTTP ${res.status}`);

    const body = (await res.json()) as LeetCodeResponse;
    const user = body.data?.matchedUser;
    if (!user) throw new Error("LeetCode: no such user");

    const solved = user.submitStatsGlobal?.acSubmissionNum;
    const totals = body.data?.allQuestionsCount ?? undefined;
    const contest = body.data?.userContestRanking ?? null;

    // Unattended contests are returned too, carrying the rating carried
    // forward; only attended rounds belong on a trend line.
    const history: RatingPoint[] = (
      body.data?.userContestRankingHistory ?? []
    )
      .filter((h) => h.attended)
      .map((h) => ({
        t: h.contest.startTime,
        rating: Math.round(h.rating),
        label: h.contest.title,
        rank: h.ranking,
      }));

    // LeetCode splits tags across three bands; the band is an editorial
    // grouping of its own, not part of the count, so they are merged and
    // ranked purely by how many problems were solved.
    const tagGroups = user.tagProblemCounts;
    const topics: TopicCount[] = [
      ...(tagGroups?.fundamental ?? []),
      ...(tagGroups?.intermediate ?? []),
      ...(tagGroups?.advanced ?? []),
    ]
      .filter((t) => t.problemsSolved > 0)
      .map((t) => ({ name: t.tagName, solved: t.problemsSolved }))
      .sort((a, b) => b.solved - a.solved);

    const badges: Badge[] = (user.badges ?? []).map((b) => ({
      name: b.displayName,
      platform: "LeetCode",
      date: b.creationDate ?? null,
      tier: null,
    }));

    const years = user.userCalendar?.activeYears ?? [];
    const activity = (await Promise.all(years.map((y) => getYear(handle, y))))
      .flat()
      .filter((d) => d.count > 0);

    return {
      handle: user.username,
      solved: pick(solved, "All"),
      easy: pick(solved, "Easy"),
      medium: pick(solved, "Medium"),
      hard: pick(solved, "Hard"),
      totalEasy: pick(totals, "Easy"),
      totalMedium: pick(totals, "Medium"),
      totalHard: pick(totals, "Hard"),
      contestRating: contest?.rating ?? null,
      maxContestRating:
        history.length > 0
          ? Math.max(...history.map((h) => h.rating))
          : (contest?.rating ?? null),
      contestsAttended: contest?.attendedContestsCount ?? null,
      globalRanking: contest?.globalRanking ?? null,
      topPercentage: contest?.topPercentage ?? null,
      profileRanking: user.profile?.ranking ?? null,
      history,
      topics,
      badges,
      activity,
    };
  } catch {
    return null;
  }
}
