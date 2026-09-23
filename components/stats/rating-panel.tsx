"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { RatingSeries } from "@/lib/stats";
import { formatNumber } from "@/lib/utils";

const W = 960;
const H = 260;
const PAD = { top: 20, right: 10, bottom: 34, left: 10 };
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One chart, switchable across platforms — the summary view that makes a
 * multi-platform record readable at a glance.
 *
 * It is drawn by hand rather than with a charting library: a library
 * brings axes, gridlines, a legend and its own tooltip chrome, none of
 * which this page wants, and every colour would then have to be fed both
 * a light and a dark value. Here the stroke and the fill are CSS custom
 * properties, so the chart re-themes with the page for free.
 */
export function RatingPanel({ series }: { series: RatingSeries[] }) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const [activeId, setActiveId] = useState(series[0]?.id ?? "");
  const [hover, setHover] = useState<number | null>(null);

  const active = series.find((s) => s.id === activeId) ?? series[0];

  const model = useMemo(() => {
    const points = active?.points ?? [];
    if (points.length < 2) return null;

    const ratings = points.map((p) => p.rating);
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const span = Math.max(max - min, 1);
    const lo = min - span * 0.22;
    const hi = max + span * 0.22;

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const baseline = H - PAD.bottom;

    const xy = points.map((p, i) => ({
      x: PAD.left + (i / (points.length - 1)) * innerW,
      y: PAD.top + (1 - (p.rating - lo) / (hi - lo)) * innerH,
      point: p,
    }));

    const line = xy
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");

    return {
      xy,
      line,
      area: `${line} L${xy[xy.length - 1].x.toFixed(2)} ${baseline} L${xy[0].x.toFixed(2)} ${baseline} Z`,
      min,
      max,
      baseline,
    };
  }, [active]);

  if (!active) return null;

  const point = hover !== null && model ? model.xy[hover] : null;
  const last = model ? model.xy[model.xy.length - 1] : null;

  return (
    <div>
      {/* platform switch */}
      <div
        role="tablist"
        aria-label="Rating history by platform"
        className="flex flex-wrap gap-1 border-b border-line"
      >
        {series.map((s) => {
          const selected = s.id === active.id;
          return (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => {
                setActiveId(s.id);
                setHover(null);
              }}
              className={`relative px-4 py-3 text-sm transition-colors duration-300 ${
                selected
                  ? "font-medium text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {s.name}
              <span className="ml-2 text-muted">
                {s.current ? formatNumber(s.current) : "—"}
              </span>
              {selected ? (
                <motion.span
                  layoutId="rating-tab"
                  aria-hidden="true"
                  className="absolute inset-x-2 -bottom-px h-0.5 bg-accent"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.4, ease: EASE }
                  }
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* readings for the selected platform */}
      <AnimatePresence mode="wait">
        <motion.dl
          key={active.id}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -8 }}
          transition={reduced ? { duration: 0 } : { duration: 0.32, ease: EASE }}
          className="mt-7 flex flex-wrap gap-x-12 gap-y-5"
        >
          {[
            {
              label: "Current rating",
              value: active.current ? formatNumber(active.current) : "—",
            },
            {
              label: "Peak",
              value: active.peak ? formatNumber(active.peak) : "—",
            },
            {
              label: "Contests",
              value: formatNumber(active.contests),
            },
          ].map((r) => (
            <div key={r.label} className="flex flex-col-reverse">
              <dt className="mt-2 text-xs text-muted">{r.label}</dt>
              <dd className="font-display text-2xl leading-none font-light text-ink">
                {r.value}
              </dd>
            </div>
          ))}
        </motion.dl>
      </AnimatePresence>

      {model ? (
        <figure className="mt-6">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none"
            role="img"
            aria-label={`${active.name} rating across ${active.points.length} contests, from ${active.points[0].rating} to ${active.points[active.points.length - 1].rating}. Peak ${model.max}.`}
            onPointerLeave={() => setHover(null)}
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - box.left) / box.width;
              const i = Math.round(
                ((ratio * W - PAD.left) / (W - PAD.left - PAD.right)) *
                  (active.points.length - 1)
              );
              setHover(Math.min(active.points.length - 1, Math.max(0, i)));
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--accent)"
                  stopOpacity="0.28"
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={model.baseline}
              y2={model.baseline}
              stroke="var(--border)"
              strokeWidth={1}
            />

            <AnimatePresence mode="wait">
              <motion.g key={active.id}>
                <motion.path
                  data-entrance=""
                  d={model.area}
                  fill={`url(#${gradientId})`}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.9, ease: EASE, delay: 0.25 }
                  }
                />
                <motion.path
                  data-entrance=""
                  d={model.line}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 1.3, ease: EASE }
                  }
                />
              </motion.g>
            </AnimatePresence>

            {last ? (
              <circle cx={last.x} cy={last.y} r={3} fill="var(--accent)" />
            ) : null}

            {point ? (
              <>
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={PAD.top}
                  y2={model.baseline}
                  stroke="var(--accent)"
                  strokeWidth={1}
                  opacity={0.45}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill="var(--bg)"
                  stroke="var(--accent)"
                  strokeWidth={1.75}
                />
              </>
            ) : null}
          </svg>

          <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 text-sm text-muted">
            <span>
              {point
                ? `${point.point.label} — ${point.point.rating}${
                    point.point.rank ? `, rank ${formatNumber(point.point.rank)}` : ""
                  }`
                : `${active.points.length} contests. Hover for a contest.`}
            </span>
            <span>
              Low {formatNumber(model.min)}, peak {formatNumber(model.max)}
            </span>
          </figcaption>
        </figure>
      ) : (
        <p className="mt-8 text-sm text-muted">
          Not enough rated contests on {active.name} yet to draw a trend.
        </p>
      )}
    </div>
  );
}
