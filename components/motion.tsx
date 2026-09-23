"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Fragment } from "react";
import type { ElementType, ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* Fire slightly before the element is fully in view, so the reveal reads
   as anticipation rather than as a delay. */
const VIEWPORT = { once: true, margin: "0px 0px -14% 0px" } as const;

/* ── Text ─────────────────────────────────────────────────────────
   Letters roll up from behind a clipping edge, one after another. Each
   character sits in its own overflow-hidden box and travels from 100%
   to 0, so the type appears to turn into place rather than fade in.

   Only `transform` animates, which the compositor handles on its own —
   no layout, no paint, no filter. That is what keeps a headline of
   fifty characters smooth. */
const container = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/**
 * The letter's resting and hidden positions.
 *
 * 125% rather than 100%-and-a-bit because the clipping wrapper is taller
 * than the glyph: it carries `padding-bottom: 0.16em` so descenders have
 * room, and `overflow: hidden` clips at the padding edge, not the
 * content edge. At 105% the glyph cleared its own height but not that
 * extra strip, so the top of every letter sat visible below the baseline
 * before the animation ran — two faint dots under the tallest ascenders.
 *
 * Measured on the hero headline, which has the tightest leading on the
 * site (0.95) and is therefore the worst case: 105% leaked 11.7px,
 * 115% leaked 1.8px, and 120% was the first to clear. 125% keeps a
 * margin for any looser use elsewhere.
 */
const glyph: Variants = {
  hidden: { y: "125%" },
  show: {
    y: "0%",
    transition: { duration: 0.62, ease: EASE },
  },
};

interface AnimatedTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Seconds between characters */
  stagger?: number;
  /** Play on mount instead of waiting to be scrolled to */
  onMount?: boolean;
}

/**
 * Rolls a line into place letter by letter.
 *
 * Reserved for headings and leads. Running body copy animates as a
 * single block instead — per-character motion on a paragraph is harder
 * to read and multiplies the node count for no benefit.
 *
 * The whole string is duplicated into a visually-hidden span so screen
 * readers and copy-paste get clean text; the animated glyphs are marked
 * aria-hidden. Words are kept in one box each so nothing breaks
 * mid-word at a line end.
 */
export function AnimatedText({
  text,
  as: Tag = "p",
  className,
  delay = 0,
  stagger = 0.022,
  onMount = false,
}: AnimatedTextProps) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  const play = onMount
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: VIEWPORT };

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden="true"
        data-entrance=""
        className="inline"
        variants={container(reduced ? 0 : stagger, reduced ? 0 : delay)}
        initial="hidden"
        {...play}
      >
        {words.map((word, w) => (
          <Fragment key={`${word}-${w}`}>
            {/* `max-w-full` lets a long word wrap between its own glyphs
                rather than forcing the line — without it a single long
                word at display size widens the whole layout viewport on
                narrow screens. The space is a real text node outside the
                wrapper, so lines still break between words normally. */}
            <span className="inline-block max-w-full align-bottom">
              {[...word].map((ch, c) => (
                <span
                  key={`${ch}-${c}`}
                  // The clipping edge. Padding plus a matching negative
                  // margin gives descenders room without adding height.
                  className="inline-block overflow-hidden align-bottom"
                  style={{ paddingBottom: "0.16em", marginBottom: "-0.16em" }}
                >
                  <motion.span
                    data-entrance=""
                    className="inline-block"
                    variants={glyph}
                    transition={reduced ? { duration: 0 } : undefined}
                  >
                    {ch}
                  </motion.span>
                </span>
              ))}
            </span>
            {w < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}

/* ── Blocks ───────────────────────────────────────────────────── */

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "ul" | "li" | "article" | "section";
}

/**
 * The standard block reveal: a short rise, matching the direction the
 * letters travel so the whole page shares one gesture.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: RevealProps) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      data-entrance=""
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={
        reduced ? { duration: 0 } : { duration: 0.6, ease: EASE, delay }
      }
    >
      {children}
    </Component>
  );
}

/**
 * Cascades its children as the group scrolls into view — the "one by
 * one" reveal used for every list, grid and ledger on the site.
 */
export function Stagger({
  children,
  className,
  stagger = 0.07,
  delay = 0,
  as = "div",
}: RevealProps & { stagger?: number }) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduced ? 0 : stagger,
            delayChildren: reduced ? 0 : delay,
          },
        },
      }}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {children}
    </Component>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: EASE },
  },
};

export function StaggerItem({
  children,
  className,
  as = "div",
}: Omit<RevealProps, "delay">) {
  const reduced = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      data-entrance=""
      className={className}
      variants={itemVariants}
      transition={reduced ? { duration: 0 } : undefined}
    >
      {children}
    </Component>
  );
}
