"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Shell } from "@/components/section";
import { ThemeToggle } from "@/components/theme-toggle";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

const sections = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "Experience", id: "experience" },
  { label: "Work", id: "work" },
  { label: "Skills", id: "skills" },
  { label: "Contact", id: "contact" },
];

/** Ignore sub-pixel scroll jitter so the bar doesn't flicker. */
const THRESHOLD = 8;
/** Always show the bar near the top of the page. */
const TOP_ZONE = 90;

export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const reduced = useReducedMotion();

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const lastY = useRef(0);

  // Hide on the way down, reveal on the way up — the bar stays out of
  // the way while reading and is one small scroll away when wanted.
  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);

      if (y < TOP_ZONE) {
        setHidden(false);
      } else if (y > lastY.current + THRESHOLD) {
        setHidden(true);
      } else if (y < lastY.current - THRESHOLD) {
        setHidden(false);
      }

      if (Math.abs(y - lastY.current) > THRESHOLD) lastY.current = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy, home only. Marks whichever section owns the middle band
  // of the viewport rather than the first one merely touching it.
  useEffect(() => {
    if (!onHome) return;
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [onHome]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the sheet on Escape, which is the expected way out.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const href = (id: string) => (onHome ? `#${id}` : `/#${id}`);

  /**
   * Same-page section links are scrolled explicitly rather than left to
   * the browser's fragment navigation.
   *
   * They have to be. On the home page, opening the mobile sheet and
   * tapping a section set `location.hash` correctly and then never
   * scrolled at all — every item, every width below `md`. Measured with
   * a real pointer click and a 40ms scroll trace: the position stayed at
   * 0 for the full two seconds, so the scroll was not being cancelled
   * part-way, it never started.
   *
   * What was ruled out, each by experiment: the `body` scroll lock below
   * (holding it clear every frame changed nothing), and scroll anchoring
   * (`overflow-anchor: none` changed nothing). What did fix it, either
   * one alone, was removing `scroll-behavior: smooth` or disabling the
   * sheet's closing height animation — so the native smooth scroll and
   * the exit animation are interacting. The desktop bar never showed it
   * because nothing animates closed there, and `/stats` never showed it
   * because `/#id` is a cross-page navigation that lands with the sheet
   * already gone.
   *
   * Rather than trade away the animation or the smooth scrolling, the
   * scroll is issued directly on the next frame, which is verified to
   * work. `scrollIntoView` honours the sections' `scroll-mt-24`, so the
   * landing offset is unchanged.
   */
  const goToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    setOpen(false);
    // Off the home page the href is `/#id`, a real navigation. That path
    // already works, so leave it to the browser.
    if (!onHome) return;
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    // Keep the address bar and the back button behaving as the anchor
    // would have.
    history.pushState(null, "", `#${id}`);
    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden && !open ? "-105%" : "0%" }}
      transition={
        reduced ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
      }
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled || open
          ? "border-b border-line bg-canvas/90 backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      <Shell>
        <div className="flex h-16 items-center justify-between gap-3 md:h-20 md:gap-6">
          <Link
            href="/"
            className="font-display min-w-0 truncate text-base font-normal tracking-tight text-ink transition-colors duration-300 hover:text-accent sm:text-lg"
          >
            {site.shortName}
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {sections.map((s) => (
              <a
                key={s.id}
                href={href(s.id)}
                onClick={(e) => goToSection(e, s.id)}
                className={cn(
                  "link-rule text-xs transition-colors duration-300",
                  onHome && active === s.id ? "text-ink" : "text-muted"
                )}
              >
                {s.label}
              </a>
            ))}
            <Link
              href="/stats"
              className={cn(
                "text-xs transition-colors duration-300",
                pathname === "/stats"
                  ? "text-accent"
                  : "text-muted hover:text-accent"
              )}
            >
              Stats
            </Link>
            <ThemeToggle />
          </nav>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="flex h-8 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-xs text-ink transition-colors duration-300 hover:border-accent sm:px-3.5"
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </Shell>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-canvas md:hidden"
          >
            <Shell>
              <ul className="flex flex-col py-2">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={href(s.id)}
                      onClick={(e) => goToSection(e, s.id)}
                      className="block border-b border-line py-4 text-sm text-ink"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    href="/stats"
                    onClick={() => setOpen(false)}
                    className="block py-4 text-sm text-accent"
                  >
                    Stats
                  </Link>
                </li>
              </ul>
            </Shell>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
