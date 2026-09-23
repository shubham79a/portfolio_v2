"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Back to the top, once you are far enough down to want it.
 *
 * Deliberately built on an IntersectionObserver rather than a scroll
 * listener. A `scroll` handler runs on every frame you move the page,
 * and the header already keeps one for its hide-on-scroll behaviour;
 * adding a second would double that per-frame work for a button that
 * changes state twice in a whole session. The sentinel below is one
 * viewport tall and pinned to the top of the document, so the browser
 * tells us when it leaves — and nothing runs in between.
 *
 * It earns its place because the header hides as you scroll down, so on
 * a long page there is otherwise no visible way back up.
 *
 * Filled with the accent rather than the surface colour. The first
 * version used `bg-surface` with a hairline border, which in dark mode
 * is #241d16 on a #1c1712 page — a few percent apart, so the control was
 * effectively invisible. A solid accent is still entirely within the
 * palette, and it is the one thing on the page asking to be clicked.
 */
export function ScrollTop() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Pinned to the document's top-left and one viewport tall. It has
          no positioned ancestor, so it measures from the page origin. */}
      <div
        ref={sentinel}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 h-screen w-px"
      />

      <AnimatePresence>
        {show ? (
          <motion.button
            type="button"
            onClick={() =>
              // globals.css already sets smooth scrolling, and turns it
              // off under prefers-reduced-motion, so this follows suit
              // without having to ask twice.
              window.scrollTo({ top: 0 })
            }
            aria-label="Back to top"
            title="Back to top"
            initial={reduced ? false : { opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-5 bottom-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-canvas shadow-lg shadow-black/25 ring-1 ring-canvas/10 transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:right-8 md:bottom-8"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
            </svg>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
