import * as cheerio from "cheerio";
import { REQUEST_TIMEOUT_MS } from "./types";
import type { ActivityDay, GitHubStats, LanguageShare } from "./types";

/**
 * GitHub, read without requiring a token.
 *
 * Contribution totals are not in the REST API at all — only GraphQL has
 * them, and that one is authenticated. So the calendar is read from the
 * same public HTML the profile page renders, which needs no auth and is
 * the same source third-party stat sites use.
 *
 * GITHUB_TOKEN is honoured when present and changes two things: the REST
 * limit goes from 60 requests an hour to 5,000, and the per-repository
 * language pass can therefore run on every refresh rather than every six
 * hours. Nothing breaks without it.
 *
 * All of this runs inside the scheduled refresh, never during a page
 * render, so the request count below is a budget question rather than a
 * latency one.
 */

const UA = "shubham-portfolio";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export function hasToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

function apiHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    "User-Agent": UA,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: apiHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Runs jobs a few at a time so a wide fan-out doesn't trip abuse detection. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  job: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        out[i] = await job(items[i]);
      }
    }
  );
  await Promise.all(workers);
  return out;
}

interface GhUser {
  login: string;
  public_repos: number;
  followers: number;
  created_at: string;
}

interface GhRepo {
  full_name: string;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  size: number;
}

/**
 * One contributions calendar. With no range this is GitHub's rolling
 * twelve months; with `year` it is that calendar year, which is how the
 * all-time total gets assembled.
 */
async function getCalendar(
  login: string,
  year?: number
): Promise<ActivityDay[] | null> {
  const range = year === undefined ? "" : `?from=${year}-01-01&to=${year}-12-31`;
  try {
    const res = await fetch(
      `https://github.com/users/${encodeURIComponent(login)}/contributions${range}`,
      {
        headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
        cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
    if (!res.ok) return null;

    const $ = cheerio.load(await res.text());

    // Each day is a <td data-date id="…">; its count lives in the
    // <tool-tip for="…"> that GitHub renders for screen readers.
    const counts = new Map<string, number>();
    $("tool-tip[for]").each((_, el) => {
      const target = $(el).attr("for");
      if (!target) return;
      const match = /^([\d,]+)\s+contribution/.exec($(el).text().trim());
      counts.set(
        target,
        match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : 0
      );
    });

    const days: ActivityDay[] = [];
    $("td[data-date]").each((_, el) => {
      const date = $(el).attr("data-date");
      const id = $(el).attr("id");
      if (!date) return;
      days.push({ date, count: (id && counts.get(id)) || 0 });
    });

    return days.length > 0 ? days : null;
  } catch {
    return null;
  }
}

interface Streaks {
  contributions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
}

function summarise(days: ActivityDay[]): Streaks {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  let longestStreak = 0;
  let running = 0;
  for (const day of sorted) {
    running = day.count > 0 ? running + 1 : 0;
    longestStreak = Math.max(longestStreak, running);
  }

  // Walk backwards from the most recent day. Today counts if it has
  // activity, but an empty today does not break a streak that is still
  // alive — the day is not over yet.
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].count > 0) currentStreak++;
    else if (i === sorted.length - 1) continue;
    else break;
  }

  return {
    contributions: sorted.reduce((sum, d) => sum + d.count, 0),
    activeDays: sorted.filter((d) => d.count > 0).length,
    currentStreak,
    longestStreak,
  };
}

/** `total_count` from a search query, or null if the search was refused. */
async function searchCount(
  kind: "issues" | "commits",
  q: string
): Promise<number | null> {
  const body = await api<{ total_count: number }>(
    `/search/${kind}?q=${encodeURIComponent(q)}&per_page=1`
  );
  return body ? body.total_count : null;
}

interface RepoTotals {
  repos: GhRepo[];
  stars: number;
  forks: number;
}

function tally(repos: GhRepo[]): RepoTotals {
  return {
    repos,
    stars: repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0),
    forks: repos.reduce((sum, r) => sum + (r.forks_count || 0), 0),
  };
}

async function getRepos(login: string): Promise<RepoTotals | null> {
  const repos: GhRepo[] = [];
  // 100 per page covers the account in one request today; the loop is
  // here so the totals stay right if it ever grows past that.
  for (let page = 1; page <= 5; page++) {
    const batch = await api<GhRepo[]>(
      `/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&page=${page}`
    );
    // Same reasoning as the language pass: half the repositories gives
    // an understated star count, which is worse than no count at all.
    if (!batch) return null;
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return tally(repos);
}

function toShares(bytes: Map<string, number>): LanguageShare[] {
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return [...bytes.entries()]
    .map(([name, value]) => ({
      name,
      bytes: value,
      share: (value / total) * 100,
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

/**
 * Byte-accurate language shares, one request per repository. This is the
 * only expensive call in the whole refresh, which is why the caller
 * decides whether to run it rather than it running unconditionally.
 */
async function getLanguageBytes(
  repos: GhRepo[]
): Promise<Map<string, number> | null> {
  const owned = repos.filter((r) => !r.fork);
  const results = await mapLimit(owned, 6, (repo) =>
    api<Record<string, number>>(`/repos/${repo.full_name}/languages`)
  );

  // All or nothing. A share is a proportion of a whole, so counting
  // eighteen repositories out of twenty-nine does not give a slightly
  // rougher answer — it gives a confidently wrong one. Running out of
  // rate limit halfway therefore abandons the pass, and the previous
  // shares are kept.
  if (results.some((r) => r === null)) return null;

  const bytes = new Map<string, number>();
  for (const result of results) {
    if (!result) continue;
    for (const [name, count] of Object.entries(result)) {
      bytes.set(name, (bytes.get(name) ?? 0) + count);
    }
  }
  return bytes.size > 0 ? bytes : null;
}

/**
 * The cheap fallback: weight each repository's declared primary language
 * by its size. That data is already in hand from the repo listing, so it
 * costs nothing. It is less accurate than real byte counts, which is why
 * the result is flagged as approximate rather than presented as exact.
 */
function approximateLanguages(repos: GhRepo[]): Map<string, number> {
  const bytes = new Map<string, number>();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    bytes.set(
      repo.language,
      (bytes.get(repo.language) ?? 0) + Math.max(repo.size, 1)
    );
  }
  return bytes;
}

export interface GitHubOptions {
  /** Whether to spend the per-repository requests on exact byte counts */
  languages: boolean;
}

export async function getGitHub(
  login: string,
  options: GitHubOptions = { languages: true }
): Promise<GitHubStats | null> {
  const [profile, recent] = await Promise.all([
    api<GhUser>(`/users/${encodeURIComponent(login)}`),
    getCalendar(login),
  ]);

  // Both halves failing means GitHub itself is unreachable. Either one
  // succeeding is still worth a reading — the merge upstream restores
  // whatever this call had to leave at zero.
  if (!profile && !recent) return null;

  const createdYear = profile
    ? new Date(profile.created_at).getUTCFullYear()
    : null;

  // All-time contributions: one calendar page per year since signup.
  const thisYear = new Date().getUTCFullYear();
  const years =
    createdYear === null
      ? []
      : Array.from(
          { length: thisYear - createdYear + 1 },
          (_, i) => createdYear + i
        );
  const yearly = await mapLimit(years, 3, (year) => getCalendar(login, year));

  const allDays = new Map<string, number>();
  for (const days of [...yearly, recent]) {
    if (!days) continue;
    for (const day of days) {
      allDays.set(day.date, Math.max(allDays.get(day.date) ?? 0, day.count));
    }
  }
  const everyDay = [...allDays.entries()].map(([date, count]) => ({
    date,
    count,
  }));
  const allTime = summarise(everyDay);
  // Only days that actually saw a contribution are kept. The calendar
  // hands back every date in the range, so storing it verbatim would be
  // mostly zeroes.
  const activity = everyDay
    .filter((d) => d.count > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const trailing = summarise(recent ?? []);

  const [repoTotals, commits, pullRequests, issues] = await Promise.all([
    getRepos(login),
    searchCount("commits", `author:${login}`),
    searchCount("issues", `author:${login} type:pr`),
    searchCount("issues", `author:${login} type:issue`),
  ]);

  let languages: LanguageShare[] = [];
  let languagesExact = false;
  let languagesAt: string | null = null;

  if (repoTotals && options.languages) {
    const exact = await getLanguageBytes(repoTotals.repos);
    if (exact) {
      languages = toShares(exact);
      languagesExact = true;
    } else {
      languages = toShares(approximateLanguages(repoTotals.repos));
    }
    if (languages.length > 0) languagesAt = new Date().toISOString();
  }

  return {
    login,
    contributions: trailing.contributions,
    totalContributions: allTime.contributions || trailing.contributions,
    activeDays: trailing.activeDays,
    totalActiveDays: allTime.activeDays || trailing.activeDays,
    // Streaks run over the whole history rather than the visible year, so
    // one that began in December is not cut off in January.
    currentStreak: allTime.currentStreak || trailing.currentStreak,
    longestStreak: Math.max(allTime.longestStreak, trailing.longestStreak),
    publicRepos: profile?.public_repos ?? 0,
    followers: profile?.followers ?? 0,
    stars: repoTotals?.stars ?? null,
    forks: repoTotals?.forks ?? null,
    commits,
    pullRequests,
    issues,
    languages,
    languagesExact,
    languagesAt,
    activity,
    createdYear,
  };
}
