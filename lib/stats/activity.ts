import type { ActivityDay, ActivitySummary } from "./types";

const DAY = 86_400_000;

/**
 * Day boundaries are drawn in IST, not UTC.
 *
 * "Active day" is a human unit — it means a day *he* worked — so it has
 * to follow his calendar. Under UTC, anything submitted between 00:00
 * and 05:29 IST lands on the previous day and can merge two real days
 * into one.
 *
 * This only changes sources that hand over raw timestamps, which is
 * Codeforces alone. LeetCode's calendar, CodeChef's heatmap array and
 * Code360's contribution map all arrive pre-bucketed by those platforms
 * and are taken as given.
 */
export const TZ_OFFSET_MINUTES = 330; // UTC+05:30

/** Unix seconds -> YYYY-MM-DD in the site's reporting timezone. */
export function toLocalDate(unixSeconds: number): string {
  return new Date((unixSeconds + TZ_OFFSET_MINUTES * 60) * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Today's date in the reporting timezone, for streaks and the heatmap. */
/**
 * Today, in UTC.
 *
 * Deliberately UTC while `toLocalDate` above stays on IST, because the
 * two answer different questions. `toLocalDate` buckets Codeforces
 * submissions, and rebucketing that history to UTC would move three
 * days off the calendar and drop the all-time total from 350 to 348.
 * This one only marks where "now" falls, and every other platform
 * already reports its days on a UTC boundary — LeetCode most visibly,
 * since it hands back a calendar keyed by UTC timestamps.
 *
 * Keeping this on IST meant the heatmap pointed at a day that LeetCode
 * did not think had started yet: at 04:00 IST the grid highlighted the
 * 6th while a submission made at that moment was filed under the 5th.
 *
 * It cannot affect the totals. `totalActiveDays` is the length of the
 * unioned day list, which is never filtered against this value; only the
 * current-streak walk and the heatmap's last cell read it.
 */
export function localToday(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}
const toUTC = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const fromUTC = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

/**
 * Merges per-day activity from several platforms into one series.
 *
 * Counts are summed per day, but *days* are unioned — working on two
 * judges on the same date is one active day, not two. That distinction
 * is the whole point of the figure, and summing platform totals instead
 * would quietly inflate it.
 */
export function mergeActivity(
  sources: { name: string; days: ActivityDay[] }[]
): ActivitySummary | null {
  const contributing = sources.filter((s) => s.days.length > 0);
  if (contributing.length === 0) return null;

  const perDay = new Map<string, number>();
  for (const source of contributing) {
    for (const day of source.days) {
      if (!day.date || day.count <= 0) continue;
      perDay.set(day.date, (perDay.get(day.date) ?? 0) + day.count);
    }
  }
  if (perDay.size === 0) return null;

  const days: ActivityDay[] = [...perDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const present = new Set(days.map((d) => d.date));

  // Longest run of consecutive calendar dates.
  let longestStreak = 0;
  let running = 0;
  let cursor = toUTC(days[0].date);
  const last = toUTC(days[days.length - 1].date);
  while (cursor <= last) {
    running = present.has(fromUTC(cursor)) ? running + 1 : 0;
    longestStreak = Math.max(longestStreak, running);
    cursor += DAY;
  }

  // Walk back from today. An empty today does not break a live streak —
  // the day is not over yet — but an empty yesterday does.
  const todayMs = toUTC(localToday());
  let currentStreak = 0;
  let probe = present.has(fromUTC(todayMs)) ? todayMs : todayMs - DAY;
  while (present.has(fromUTC(probe))) {
    currentStreak++;
    probe -= DAY;
  }

  return {
    totalActiveDays: days.length,
    currentStreak,
    longestStreak,
    totalSubmissions: days.reduce((sum, d) => sum + d.count, 0),
    days,
    sources: contributing.map((s) => s.name),
    today: localToday(),
  };
}

/** How far back the heatmap lets you browse. */
export const HEATMAP_YEARS = 3;

/**
 * The earliest day the heatmap can show, given today.
 *
 * Floored to a half-year boundary so it lines up exactly with the
 * periods the picker offers — shipping days that no period can display
 * would be pure payload. The page slices on this and the component
 * generates its options from it, so the two cannot drift apart.
 */
export function heatmapWindowStart(today: string): string {
  const year = Number(today.slice(0, 4)) - HEATMAP_YEARS;
  const month = Number(today.slice(5, 7)) > 6 ? "07" : "01";
  return `${year}-${month}-01`;
}
