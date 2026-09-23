"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LanguageShare } from "@/lib/stats";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Language shares as one continuous bar plus a legend.
 *
 * A bar rather than a ring because the values are a spectrum with a long
 * tail — eight slices of a donut at four percent each are unreadable,
 * while eight slivers of a bar still show their order honestly.
 *
 * Colour is the site accent stepped down toward the page ground, so the
 * ramp encodes rank by weight rather than by hue. That keeps it inside
 * the palette in both themes and keeps it legible without colour vision.
 */
function tone(index: number, count: number): string {
  const top = 92;
  const bottom = 24;
  const step = count > 1 ? (top - bottom) / (count - 1) : 0;
  return `color-mix(in oklab, var(--accent) ${Math.round(top - step * index)}%, var(--bg))`;
}

/** Everything past the eighth language is folded into one honest remainder. */
function condense(languages: LanguageShare[], limit: number): LanguageShare[] {
  if (languages.length <= limit) return languages;
  const head = languages.slice(0, limit);
  const tail = languages.slice(limit);
  return [
    ...head,
    {
      name: `${tail.length} more`,
      bytes: tail.reduce((sum, l) => sum + l.bytes, 0),
      share: tail.reduce((sum, l) => sum + l.share, 0),
    },
  ];
}

export function Languages({
  languages,
  limit = 8,
}: {
  languages: LanguageShare[];
  limit?: number;
}) {
  const reduced = useReducedMotion();
  const rows = condense(languages, limit);
  if (rows.length === 0) return null;

  return (
    <div>
      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface"
        role="img"
        aria-label={rows
          .map((l) => `${l.name} ${l.share.toFixed(1)}%`)
          .join(", ")}
      >
        {rows.map((language, i) => (
          <motion.span
            key={language.name}
            data-entrance=""
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: tone(i, rows.length) }}
            initial={reduced ? false : { width: 0 }}
            whileInView={{ width: `${language.share}%` }}
            viewport={{ once: true, margin: "0px 0px -15% 0px" }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.8, ease: EASE, delay: 0.08 + i * 0.07 }
            }
          />
        ))}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((language, i) => (
          <motion.div
            key={language.name}
            data-entrance=""
            className="flex flex-col-reverse border-t border-line pt-4"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -12% 0px" }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.5, ease: EASE, delay: 0.1 + i * 0.05 }
            }
          >
            <dt className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tone(i, rows.length) }}
              />
              <span className="truncate">{language.name}</span>
            </dt>
            <dd className="font-display text-2xl leading-none font-light text-ink">
              {language.share.toFixed(1)}
              <span className="text-accent">%</span>
            </dd>
          </motion.div>
        ))}
      </dl>
    </div>
  );
}
