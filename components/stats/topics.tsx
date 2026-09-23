"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { TopicCount } from "@/lib/stats";
import { formatNumber } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Topic breakdown as a ranked bar chart.
 *
 * Bars grow from the left with `scaleX` on a fixed-width track, so the
 * animation is a single compositor transform rather than a per-frame
 * width recalculation — that is the difference between smooth and janky
 * once a dozen rows animate at once.
 *
 * Every bar is a tonal step of the site accent, weighted by rank, so the
 * chart reads as one material instead of a palette of unrelated hues.
 */
export function TopicChart({
  topics,
  limit = 10,
}: {
  topics: TopicCount[];
  limit?: number;
}) {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  if (topics.length === 0) return null;

  const rows = expanded ? topics : topics.slice(0, limit);
  // Scale against the overall leader, not the visible leader, so bars do
  // not rescale when the list expands.
  const max = topics[0].solved || 1;
  const hidden = topics.length - limit;

  return (
    <div>
      <ul className="flex flex-col gap-3.5">
      {rows.map((topic, i) => {
        const ratio = topic.solved / max;
        // Strongest topics carry the full accent; the tail steps back
        // toward the page so the ranking is legible without a legend.
        const tone =
          i < 2 ? "var(--accent)" : i < 5 ? "var(--accent-mid)" : "var(--accent-soft)";
        // The soft step is too close to the page to carry canvas-coloured
        // text, so the label flips to ink once the bar gets that pale.
        const labelClass = i < 5 ? "text-canvas" : "text-ink";
        // Every bar is wide enough to hold its own number, so the
        // labels sit in one consistent place down the column instead of
        // some inside and some floating past the end.
        const pct = Math.max(ratio * 100, 14);

        return (
          <li
            key={topic.name}
            className="grid grid-cols-1 gap-1.5 sm:grid-cols-[12rem_1fr] sm:items-center sm:gap-4"
          >
            <span className="text-sm text-muted sm:truncate sm:text-right">
              {topic.name}
            </span>

            <span className="relative flex h-8 items-center">
              <span className="absolute inset-0 rounded-md bg-line/40" />
              <motion.span
                data-entrance=""
                className="absolute inset-y-0 left-0 origin-left rounded-md"
                style={{ width: `${pct}%`, backgroundColor: tone }}
                initial={reduced ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "0px 0px -12% 0px" }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.85, ease: EASE, delay: i * 0.06 }
                }
              />
              <span
                className={`absolute left-3 z-10 text-sm ${labelClass}`}
              >
                {formatNumber(topic.solved)}
              </span>
            </span>
          </li>
        );
      })}
      </ul>

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          {expanded ? "Show top 10" : `Show all ${topics.length} topics`}
          <motion.span
            aria-hidden="true"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.35, ease: EASE }}
            className="text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </motion.span>
        </button>
      ) : null}
    </div>
  );
}
