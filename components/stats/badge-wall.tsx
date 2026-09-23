"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Badge } from "@/lib/stats";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Badges grouped by the platform that issued them.
 *
 * Rendered as hexagonal plates in the site's own accent rather than as
 * the platforms' coloured medal art: a dozen borrowed gold-and-purple
 * icons would drag a second palette into the page. The tier is carried
 * by fill weight and stated in words, so nothing depends on colour.
 */
export function BadgeWall({ badges }: { badges: Badge[] }) {
  const reduced = useReducedMotion();

  const platforms = [...new Set(badges.map((b) => b.platform))];

  return (
    <div className="flex flex-col gap-10">
      {platforms.map((platform) => {
        const group = badges.filter((b) => b.platform === platform);
        return (
          <div key={platform}>
            <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
              <h3 className="text-base text-ink">{platform}</h3>
              <span className="text-xs text-muted">
                {group.length} {group.length === 1 ? "badge" : "badges"}
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {group.map((badge, i) => (
                <motion.li
                  key={`${platform}-${badge.name}-${i}`}
                  data-entrance=""
                  className="group flex items-center gap-3.5 rounded-xl border border-line bg-surface/70 p-4 transition-colors duration-300 hover:border-accent"
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -12% 0px" }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.5, ease: EASE, delay: Math.min(i * 0.05, 0.4) }
                  }
                >
                  <Hex tier={badge.tier} />
                  <span className="min-w-0">
                    <span className="block text-sm leading-snug break-words text-ink">
                      {badge.name}
                    </span>
                    <span className="mt-0.5 block text-2xs text-muted">
                      {badge.tier ?? (badge.date ? formatDate(badge.date) : platform)}
                    </span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(d);
}

/** Higher tiers get a solid plate; lower ones an outline. */
function Hex({ tier }: { tier: string | null }) {
  const strong = tier
    ? /master|specialist|gold|platinum|diamond/i.test(tier)
    : false;

  return (
    <span
      aria-hidden="true"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <polygon
          points="20,2 36,11 36,29 20,38 4,29 4,11"
          fill={strong ? "var(--accent)" : "var(--accent-wash)"}
          stroke="var(--accent)"
          strokeWidth={1.25}
          strokeLinejoin="round"
          opacity={strong ? 1 : 0.85}
        />
      </svg>
      <span
        className="absolute h-2 w-2 rounded-full"
        style={{ backgroundColor: strong ? "var(--bg)" : "var(--accent)" }}
      />
    </span>
  );
}
