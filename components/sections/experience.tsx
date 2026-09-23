"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Section, Lead } from "@/components/section";
import { Reveal } from "@/components/motion";
import { experience } from "@/content/experience";
import { isPlaceholder } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The one place on the site with a genuine sequence, so the one place a
 * timeline is honest. The rail carries real dates rather than invented
 * ordinals, and only the current role gets the filled node.
 *
 * Each tile owns its own scroll trigger instead of sharing a parent
 * stagger. That is the difference between "the whole list animates when
 * the section arrives" and "each role rises as you reach it", which is
 * the behaviour wanted here.
 */
export function Experience() {
  const reduced = useReducedMotion();

  return (
    <Section
      id="experience"
      label="Experience"
      meta={`${experience.length} roles, all remote`}
    >
      <Lead>Two internships so far. Both remote, and most of the work
      under the surface.</Lead>

      <ol className="relative mt-12">
        {/* the spine, drawn once behind every tile */}
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-[7px] w-px bg-line md:left-[9px]"
        />

        {experience.map((role) => (
          <motion.li
            key={`${role.company}-${role.period}`}
            data-entrance=""
            className="relative pb-5 pl-8 last:pb-0 md:pl-12"
            initial={reduced ? false : { opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -18% 0px" }}
            transition={
              reduced ? { duration: 0 } : { duration: 0.65, ease: EASE }
            }
          >
            {/* node on the spine */}
            <span
              aria-hidden="true"
              className={
                role.current
                  ? "absolute top-7 left-0 h-4 w-4 rounded-full border-2 border-accent bg-accent md:left-0.5"
                  : "absolute top-7 left-0 h-4 w-4 rounded-full border border-line bg-canvas md:left-0.5"
              }
            />

            <article className="group rounded-2xl border border-line bg-surface/70 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent hover:bg-surface sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
                <h3 className="font-display text-xl leading-tight font-normal text-ink transition-colors duration-300 group-hover:text-accent">
                  {role.company}
                </h3>
                <p className="text-xs text-muted">
                  {role.period}
                  {role.current ? " · current" : ""}
                </p>
              </div>

              <p className="mt-2 text-sm text-accent">
                {role.title}
                <span className="text-muted"> — {role.location}</span>
              </p>

              <ul className="mt-5 max-w-[68ch] space-y-3">
                {role.points.map((point) => (
                  <li
                    key={point.slice(0, 40)}
                    className="relative pl-5 text-sm text-muted before:absolute before:top-[0.62em] before:left-0 before:h-px before:w-2.5 before:bg-accent/50"
                  >
                    {point}
                  </li>
                ))}
              </ul>

              {!isPlaceholder(role.certificateUrl) ? (
                <a
                  href={role.certificateUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-inline mt-5 inline-block text-sm"
                >
                  Completion certificate
                </a>
              ) : null}
            </article>
          </motion.li>
        ))}
      </ol>

      <Reveal delay={0.05}>
        <p className="mt-8 text-xs text-muted">
          Listed most recent first.
        </p>
      </Reveal>
    </Section>
  );
}
