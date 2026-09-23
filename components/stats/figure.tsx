"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { formatNumber } from "@/lib/utils";

interface FigureProps {
  value: number;
  label: string;
  /** Optional qualifier under the label, e.g. "across three judges" */
  note?: string;
  /** Rendered immediately after the number, inside the same baseline */
  suffix?: string;
}

/**
 * A number that counts up the first time it is seen. This is the one
 * piece of decorative-looking motion on the site that isn't decorative:
 * it's tied to a figure that genuinely changes between visits.
 *
 * The final value is what the server renders, so the page is correct
 * without JavaScript and correct for crawlers. The animation only ever
 * replaces the text of an element whose width is already reserved by an
 * invisible copy of the final string — so counting causes no reflow.
 */
export function Figure({ value, label, note, suffix }: FigureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduced = useReducedMotion();
  const final = formatNumber(value);

  useEffect(() => {
    if (!inView || reduced) return;
    const node = numberRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = formatNumber(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <div ref={ref}>
      <p className="font-display text-3xl leading-none font-light text-ink md:text-4xl">
        <span className="relative inline-block">
          {/* Reserves the final width so the digits never shift the row */}
          <span aria-hidden="true" className="invisible">
            {final}
          </span>
          <span ref={numberRef} className="absolute inset-0">
            {final}
          </span>
        </span>
        {suffix ? (
          <span className="text-accent">{suffix}</span>
        ) : null}
      </p>
      <p className="mt-3 text-xs text-muted">{label}</p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </div>
  );
}
