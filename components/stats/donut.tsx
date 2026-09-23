"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { formatNumber } from "@/lib/utils";

export interface Band {
  label: string;
  value: number;
  /** Which tonal step of the accent to use, darkest last */
  tone: "soft" | "mid" | "full";
}

const TONE: Record<Band["tone"], string> = {
  soft: "var(--accent-soft)",
  mid: "var(--accent-mid)",
  full: "var(--accent)",
};

const R = 52;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A ring split by band, with the total counting up in the middle.
 *
 * Segments use Framer Motion's `pathLength` / `pathOffset` rather than a
 * hand-computed `strokeDasharray`. That is not a style preference: the
 * moment `pathLength` animates, Framer takes ownership of dasharray and
 * dashoffset and overwrites any values set alongside it, which silently
 * collapses every segment. These two props are the supported way to
 * express "this arc covers this fraction, starting here".
 *
 * The bands are three tonal steps of the site accent rather than the
 * red/amber/green every judge uses: it stays inside the palette, and it
 * encodes difficulty by value rather than hue, so it still reads for
 * anyone who cannot separate red from green.
 */
export function Donut({
  bands,
  total,
  caption,
}: {
  bands: Band[];
  total: number;
  caption: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const sum = bands.reduce((a, b) => a + b.value, 0) || 1;

  useEffect(() => {
    if (!inView || reduced) return;
    const node = numberRef.current;
    if (!node) return;
    const controls = animate(0, total, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => {
        node.textContent = formatNumber(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, total, reduced]);

  // Each segment's start is the share of everything before it, derived
  // rather than accumulated so nothing is mutated during render.
  const segments = bands.map((band, i) => ({
    band,
    fraction: band.value / sum,
    offset: bands.slice(0, i).reduce((a, b) => a + b.value, 0) / sum,
  }));

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-x-10 gap-y-6">
      <div className="relative h-[136px] w-[136px] shrink-0">
        <svg viewBox="0 0 136 136" className="h-full w-full -rotate-90">
          <circle
            cx="68"
            cy="68"
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth={11}
          />
          {segments.map((s, i) => (
            <motion.circle
              key={s.band.label}
              data-entrance=""
              cx="68"
              cy="68"
              r={R}
              fill="none"
              stroke={TONE[s.band.tone]}
              strokeWidth={11}
              strokeLinecap="butt"
              // pathOffset is an animatable SVG value, not a DOM
              // attribute, so it travels in the animation targets.
              initial={
                reduced ? false : { pathLength: 0, pathOffset: s.offset }
              }
              whileInView={{ pathLength: s.fraction, pathOffset: s.offset }}
              viewport={{ once: true, margin: "0px 0px -15% 0px" }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.9, ease: EASE, delay: 0.1 + i * 0.14 }
              }
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl leading-none font-light text-ink">
            <span className="relative inline-block">
              <span aria-hidden="true" className="invisible">
                {formatNumber(total)}
              </span>
              <span ref={numberRef} className="absolute inset-0 text-center">
                {formatNumber(total)}
              </span>
            </span>
          </span>
          <span className="mt-1.5 text-xs text-muted">{caption}</span>
        </div>
      </div>

      <dl className="min-w-[9rem] flex-1 space-y-2.5">
        {bands.map((band) => (
          <div
            key={band.label}
            className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-b-0 sm:gap-6"
          >
            {/* `min-w-0` lets the label give way first, `shrink-0` keeps
                the number whole. Without the pair, the label refused to
                shrink and pushed the figure out of the panel on narrow
                phones. The gap also starts smaller and only opens up
                once there is room for it. */}
            <dt className="flex min-w-0 items-center gap-2.5 text-sm text-muted">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: TONE[band.tone] }}
              />
              {band.label}
            </dt>
            <dd className="shrink-0 text-base text-ink">
              {formatNumber(band.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
