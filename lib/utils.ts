import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Content files use `[INSERT_…]` for values that are not known yet.
 * The UI checks with this rather than rendering a dead link or an
 * invented URL.
 */
export function isPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith("[INSERT_");
}

/** e.g. 1797.77 → "1798"; keeps figures honest and column-aligned. */
export function round(value: number): number {
  return Math.round(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Floors to the nearest hundred and marks it open-ended: 632 -> "600+".
 * Used where a solved count is a claim about scale rather than a precise
 * reading — it stays true for longer and does not invite the reader to
 * check it against a live figure elsewhere on the page.
 *
 * Below 100 there is no meaningful hundred to floor to, so the exact
 * number is returned rather than a misleading "0+".
 */
export function roundedHundreds(value: number): string {
  if (value < 100) return formatNumber(value);
  return `${formatNumber(Math.floor(value / 100) * 100)}+`;
}

/** "A, B and C" — used wherever a list of platforms is named in prose. */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * "Last updated" line on /stats. Rendered on the server, so it is pinned
 * to a fixed timezone — otherwise the server's string and the client's
 * string disagree and React reports a hydration mismatch.
 */
/**
 * A real instant, rendered in IST.
 *
 * Only genuine timestamps go through here — when a refresh ran, when a
 * platform was last reachable. Plain date strings such as an activity
 * day or a badge date must NOT use this: those are already bucketed into
 * IST upstream and stored as bare YYYY-MM-DD, so re-interpreting them in
 * a timezone would shift half of them to the previous day.
 */
export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: false,
  }).format(new Date(iso));
}
