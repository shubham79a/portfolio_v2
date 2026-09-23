"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { HEATMAP_YEARS, type ActivityDay } from "@/lib/stats";
import { cn, formatNumber } from "@/lib/utils";

const DAY = 86_400_000;
const CELL = 14;
const GAP = 3;
/** Space between one month's block and the next */
const BLOCK_GAP = 14;
const GRID_H = 7 * (CELL + GAP);
/** Room under the grid for the month names */
const LABEL_H = 20;
const EASE = [0.22, 1, 0.36, 1] as const;

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface Period {
  id: string;
  label: string;
  /** Inclusive ISO bounds of the window */
  start: string;
  end: string;
}

/**
 * Six months of submission activity, one block per month, with a picker
 * for which six.
 *
 * Six rather than twelve is a performance decision as much as a visual
 * one: half the cells and half the path data, and the grid stays inside
 * the content column instead of sprawling past it.
 *
 * Every cell is drawn by one of five <path> elements, one per intensity
 * step, rather than by its own <rect>. That is the most important thing
 * in this file. With a rect each, the browser had ~371 elements to
 * reconcile, resolve `var()` fills against and paint, and changing the
 * period cost around 300ms of blocked main thread on a throttled
 * machine. Five paths cost five of each — which is also why splitting
 * the view into month blocks is free, and why the cells could be made
 * bigger without paying for it.
 *
 * Five tonal steps of the accent rather than a green ramp, so it belongs
 * to the page. Levels are cut on fixed thresholds rather than on
 * percentiles: a fixed scale means a quiet week looks quiet instead of
 * being stretched to fill the palette.
 */
export function Heatmap({
  days,
  /** Distinguishes two pickers on one page from each other */
  id = "activity",
  /** What a cell counts, singular */
  noun = "submission",
  /**
   * Today, supplied by the server. Reading the clock during render would
   * be impure and would also let the server and client disagree about
   * where "today" falls, which is a hydration mismatch.
   */
  today: todayIso,
}: {
  days: ActivityDay[];
  id?: string;
  noun?: string;
  today: string;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<{ date: string; count: number } | null>(
    null,
  );

  /**
   * "Last 6 months" is a true rolling window — six months back from
   * today, to the day — rather than six whole calendar months. That is
   * why its first block is usually a part-month: the period ends today,
   * so it has to start on today's date six months earlier.
   *
   * The rest are fixed half-years. A named period holds still while the
   * rolling one moves, which is what makes it worth browsing back to.
   */
  const periods = useMemo<Period[]>(() => {
    const year = Number(todayIso.slice(0, 4));
    const month = Number(todayIso.slice(5, 7)) - 1;
    const day = Number(todayIso.slice(8, 10));

    const list: Period[] = [
      {
        id: "current",
        label: "Last 6 months",
        start: iso(Date.UTC(year, month - 6, day + 1)),
        end: todayIso,
      },
    ];

    const floorYear = year - HEATMAP_YEARS;
    const floorHalf = month > 5 ? 1 : 0;
    for (let y = year; y >= floorYear; y--) {
      for (const half of [1, 0]) {
        if (y === floorYear && half < floorHalf) continue;
        if (y === year && half * 6 > month) continue;
        list.push({
          id: `${y}-${half}`,
          label: `${y} · ${half ? "Jul – Dec" : "Jan – Jun"}`,
          start: `${y}-${half ? "07" : "01"}-01`,
          end: `${y}-${half ? "12-31" : "06-30"}`,
        });
      }
    }
    return list;
  }, [todayIso]);

  const [periodId, setPeriodId] = useState("current");
  const active = periods.find((p) => p.id === periodId) ?? periods[0];

  const model = useMemo(() => {
    const counts = new Map(days.map((d) => [d.date, d.count]));
    const from = Date.parse(`${active.start}T00:00:00Z`);
    const periodEnd = Date.parse(`${active.end}T00:00:00Z`);
    const today = Date.parse(`${todayIso}T00:00:00Z`);

    const blocks: {
      x: number;
      label: string;
      weeks: { date: string; count: number; blank: boolean }[][];
    }[] = [];
    const levels = ["", "", "", "", ""];
    let x = 0;
    let total = 0;

    // Every month the period covers, including ones still in the future.
    // Clipping the span at today was what made "2026 · Jul – Dec" render
    // as three blocks in September and jump back to six in January; only
    // individual days are withheld now, never whole months.
    const firstMonth = new Date(from);
    const lastMonth = new Date(periodEnd);
    const span =
      (lastMonth.getUTCFullYear() - firstMonth.getUTCFullYear()) * 12 +
      (lastMonth.getUTCMonth() - firstMonth.getUTCMonth());

    for (let i = 0; i <= span; i++) {
      const year = firstMonth.getUTCFullYear();
      const month = firstMonth.getUTCMonth() + i;
      const first = Date.UTC(year, month, 1);
      const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const lead = new Date(first).getUTCDay();
      // Each month takes only the weeks it actually spans, four to six
      // depending on where its 1st falls. Reserving six for every month
      // kept the blocks uniform, but a five-week month then carried a
      // column of dead width — most visibly after the final month,
      // where it read as the grid trailing off into nothing.
      //
      // Uniform blocks were never what held the picker and the legend
      // still: the fixed frame around this does that, and the grid
      // simply scrolls inside it.
      const columns = Math.ceil((lead + length) / 7);

      const weeks: { date: string; count: number; blank: boolean }[][] = [];
      for (let c = 0; c < columns; c++) {
        const column: { date: string; count: number; blank: boolean }[] = [];
        for (let d = 0; d < 7; d++) {
          const dayOfMonth = c * 7 + d - lead;
          const inMonth = dayOfMonth >= 0 && dayOfMonth < length;
          const ms = first + dayOfMonth * DAY;
          // Inside the period's own range, as opposed to the padding
          // slots a month needs to start on the right weekday.
          const inGrid = inMonth && ms >= from && ms <= periodEnd;
          const future = ms > today;
          const date = inMonth ? iso(ms) : "";
          const count = inGrid && !future ? (counts.get(date) ?? 0) : 0;

          // A day that simply has not happened yet is still part of the
          // period, so it is drawn at the empty level rather than left
          // out. Skipping them made a half-finished period trail off
          // into blank space instead of reading as a full grid.
          if (inGrid) {
            if (!future) total += count;
            levels[future ? 0 : levelFor(count)] += square(
              x + c * (CELL + GAP),
              d * (CELL + GAP),
            );
          }

          // `blank` now means "nothing to report on hover", which covers
          // padding slots and days in the future alike.
          column.push({ date, count, blank: !inGrid || future });
        }
        weeks.push(column);
      }

      blocks.push({
        x,
        label: MONTH_NAMES[new Date(first).getUTCMonth()],
        weeks,
      });
      x += columns * (CELL + GAP) + BLOCK_GAP;
    }

    return { blocks, levels, total, width: Math.max(0, x - BLOCK_GAP) };
  }, [days, active, todayIso]);

  const height = GRID_H + LABEL_H;
  const caption =
    active.id === "current"
      ? "last 6 months"
      : active.label.replace(" · ", " ");

  return (
    /**
     * A fixed frame, not one that hugs its contents.
     *
     * Sizing this to the grid meant the whole block resized with the
     * period: a six-month window and a seven-month one are ~120px apart,
     * so the picker and the legend slid left and right every time you
     * changed the dropdown. The frame is now constant and the grid
     * scrolls inside it, which keeps the controls still — and they sit
     * outside the scrolling area, so they never move with it either.
     *
     * 44rem holds a six-block period outright; the seven-block rolling
     * window overflows by about 90px and scrolls, which is the intended
     * trade.
     */
    <div className="w-full max-w-[44rem]">
      {/* Stacked on a phone. Side by side, the count was squeezed into a
          column narrow enough to wrap "1,462 submissions · 2025 Jul –
          Dec" across four lines beside the picker. The period is dropped
          from the text as well: the control right next to it already
          says which one is showing. */}
      <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-muted">
          {formatNumber(model.total)} {noun}s
        </p>
        <PeriodPicker
          id={id}
          periods={periods}
          value={active}
          onChange={setPeriodId}
        />
      </div>

      {/* `dir="rtl"` starts the scroller at its right edge, so the view
          opens on the most recent month and older ones are a scroll to
          the left — which is the way round you actually want to read it.
          Done in CSS rather than by setting scrollLeft in an effect,
          which would only run after hydration and show a visible jump
          from the left edge. The inner wrapper puts direction back so
          nothing inside is mirrored. */}
      <div dir="rtl" className="w-full min-w-0 max-w-full overflow-x-auto pb-2">
        {/* `min-w-full` matters because the scroller is RTL. Without it
            a grid narrower than the frame would align to the right and
            the empty space would simply reappear on the other side. */}
        <div dir="ltr" className="w-max min-w-full">
          <svg
            width={model.width}
            height={height}
            viewBox={`0 0 ${model.width} ${height}`}
            role="img"
            aria-label={`${noun} activity, ${caption}: ${formatNumber(model.total)} ${noun}s.`}
            className="block max-w-none shrink-0"
            onPointerLeave={() => setHover(null)}
            onPointerMove={(event) => {
              // Which cell the pointer is over, from geometry. A rect each
              // would mean hundreds of fresh closures on every render for
              // a value that is two divisions and a short loop away.
              const box = event.currentTarget.getBoundingClientRect();
              const px = event.clientX - box.left;
              const di = Math.floor((event.clientY - box.top) / (CELL + GAP));
              let found: { date: string; count: number } | null = null;
              for (const block of model.blocks) {
                const wi = Math.floor((px - block.x) / (CELL + GAP));
                const cell = wi >= 0 ? block.weeks[wi]?.[di] : undefined;
                if (cell && !cell.blank) {
                  found = { date: cell.date, count: cell.count };
                  break;
                }
              }
              setHover(found);
            }}
          >
            <motion.g
              data-entrance=""
              initial={reduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={
                reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }
              }
            >
              {model.levels.map((d, level) =>
                d ? <path key={level} d={d} fill={LEVEL_FILL[level]} /> : null,
              )}
            </motion.g>

            {model.blocks.map((block) => (
              <text
                key={`${block.label}-${block.x}`}
                x={block.x}
                y={GRID_H + 13}
                fontSize={11}
                fill="var(--text-muted)"
              >
                {block.label}
              </text>
            ))}
          </svg>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-muted" aria-live="polite">
          {hover
            ? `${formatNumber(hover.count)} ${hover.count === 1 ? noun : `${noun}s`} on ${formatDay(hover.date)}`
            : `Hover a day for its count`}
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-2xs text-muted">Less</span>
          {[0, 1, 3, 6, 10].map((n) => (
            <span
              key={n}
              aria-hidden="true"
              className="h-[11px] w-[11px] rounded-[3px]"
              style={{ backgroundColor: fillFor(n) }}
            />
          ))}
          <span className="text-2xs text-muted">More</span>
        </div>
      </div>
    </div>
  );
}

/**
 * The period control, built rather than borrowed.
 *
 * A native <select> was the first version and it was wrong twice over:
 * the popup is painted by the operating system, so it arrived with a
 * blue highlight that belongs to no part of this site, and its length
 * cannot be capped, so eight half-years produced a list taller than the
 * chart. This is a listbox: themed, and scrolled at three rows.
 *
 * It costs almost nothing. The options only exist in the DOM while the
 * menu is open, so the closed state is one button.
 */
function PeriodPicker({
  id,
  periods,
  value,
  onChange,
}: {
  id: string;
  periods: Period[];
  value: Period;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted row in view while arrowing through a list that
  // only shows three at a time.
  useEffect(() => {
    if (!open) return;
    const node = list.current?.children[cursor] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  /** Opening always starts the cursor on whatever is currently selected. */
  const openMenu = () => {
    setCursor(periods.findIndex((p) => p.id === value.id));
    setOpen(true);
  };

  const commit = (index: number) => {
    onChange(periods[index].id);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (
      !open &&
      (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, periods.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commit(cursor);
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        id={`${id}-period`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent/60 focus:border-accent focus:outline-none"
      >
        <span className="whitespace-nowrap">{value.label}</span>
        <svg
          viewBox="0 0 10 6"
          aria-hidden="true"
          className={cn(
            "h-1.5 w-2.5 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1.5 w-max min-w-full overflow-hidden rounded-md border border-line bg-surface shadow-lg shadow-black/20">
          <ul
            ref={list}
            role="listbox"
            aria-labelledby={`${id}-period`}
            tabIndex={-1}
            // Three rows, then scroll. The fade below hints there is more.
            className="max-h-30 overflow-y-auto overscroll-contain py-1"
          >
            {periods.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={p.id === value.id}
                onPointerEnter={() => setCursor(i)}
                onClick={() => commit(i)}
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  p.id === value.id ? "text-accent" : "text-ink",
                  i === cursor && "bg-accent/10",
                )}
              >
                {p.label}
              </li>
            ))}
          </ul>
          {periods.length > 3 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-surface to-transparent"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Fixed thresholds, so a quiet week reads as quiet. */
function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

/**
 * The heatmap's own ramp, rather than the shared accent tokens.
 *
 * Those tokens are tuned for washes behind text, so `--accent-wash` sits
 * at 16% accent — which put a one-submission day at rgb(52,41,31)
 * against rgb(51,41,30) for a day with nothing. A perceptual gap of 2 in
 * dark and 6 in light: indistinguishable, so an active week read as
 * empty.
 *
 * These four mixes were chosen by measuring the rendered sRGB of each
 * candidate and comparing adjacent steps. 38/58/78/100 gives gaps of
 * 83, 78, 83, 95 in dark and 112, 86, 84, 89 in light — near-even, with
 * the first step now unmistakable. Level 0 is left on the border colour
 * so "nothing happened" still reads as part of the page rather than as
 * data.
 *
 * Kept local because `--accent-wash`, `--accent-soft` and `--accent-mid`
 * are also used by the donut, the skill chips and the hero backdrop,
 * where the lighter values are correct.
 */
const LEVEL_FILL = [
  "var(--color-line, var(--border))",
  "color-mix(in oklab, var(--accent) 38%, var(--bg))",
  "color-mix(in oklab, var(--accent) 58%, var(--bg))",
  "color-mix(in oklab, var(--accent) 78%, var(--bg))",
  "var(--accent)",
] as const;

function fillFor(count: number): string {
  return LEVEL_FILL[levelFor(count)];
}

/** One rounded cell as path data, so many cells share a single element. */
function square(x: number, y: number): string {
  const r = 3;
  const inner = CELL - 2 * r;
  return (
    `M${x + r},${y}h${inner}a${r},${r} 0 0 1 ${r},${r}` +
    `v${inner}a${r},${r} 0 0 1 ${-r},${r}` +
    `h${-inner}a${r},${r} 0 0 1 ${-r},${-r}` +
    `v${-inner}a${r},${r} 0 0 1 ${r},${-r}z`
  );
}

function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
