"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Shell } from "@/components/section";
import { AnimatedText, Stagger, StaggerItem } from "@/components/motion";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { site, socials } from "@/content/site";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface HeroLiveStat {
  label: string;
  value: string;
}

/**
 * The opening moment. The name rolls into place letter by letter, a rule
 * draws itself across, then the copy and the live record arrive in
 * sequence — the record last, because it is what the page most wants you
 * to click.
 */
export function Hero({ live }: { live: HeroLiveStat[] }) {
  const reduced = useReducedMotion();

  return (
    <section
      id="home"
      className="hero-frame relative flex flex-col justify-center overflow-hidden pt-28 pb-20 md:pt-32"
    >
      <HeroBackdrop />

      <Shell className="relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_auto] lg:gap-16">
          <div className="order-2 lg:order-1">
            <h1 className="font-display text-[2.4rem] leading-[0.95] font-light tracking-tight text-ink sm:text-4xl md:text-5xl">
              <AnimatedText
                as="span"
                text="Shubham"
                className="block"
                onMount
                delay={0.15}
                stagger={0.04}
              />
              <AnimatedText
                as="span"
                text="Kumar"
                className="block"
                onMount
                delay={0.3}
                stagger={0.04}
              />
            </h1>

            <motion.div
              data-entrance=""
              className="mt-8 h-px origin-left bg-accent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 1.1, ease: EASE, delay: 0.7 }
              }
            />

            <AnimatedText
              as="p"
              text="I build backends that stay correct when things go wrong."
              className="font-display mt-8 max-w-[24ch] text-xl leading-[1.18] font-light text-ink sm:text-2xl md:text-3xl"
              onMount
              delay={0.9}
              stagger={0.014}
            />

            <Stagger className="mt-6" delay={1.3} stagger={0.12}>
              <StaggerItem>
                <p className="max-w-[54ch] text-sm text-muted">
                  Computer Science and Engineering at IIIT Ranchi, class of
                  2027, CGPA 8.15. I build platforms across the stack &mdash;
                  most recently at Practitionist, where I designed the
                  constraint system that stops a multi-service booking engine
                  from double-booking anyone. Looking for a software developer
                  internship or graduate role.
                </p>
              </StaggerItem>

              <StaggerItem className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href={`mailto:${site.email}`}
                  className="link-rule text-sm text-ink"
                >
                  {site.email}
                </a>
                <a
                  href={site.resume}
                  className="link-rule text-sm text-muted"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Résumé
                </a>
              </StaggerItem>

              {live.length > 0 ? (
                <StaggerItem className="mt-10">
                  <dl className="flex flex-wrap gap-x-10 gap-y-4">
                    {live.map((stat) => (
                      <div key={stat.label} className="flex flex-col-reverse">
                        <dt className="mt-1 text-2xs text-muted">
                          {stat.label}
                        </dt>
                        <dd className="font-display text-xl font-light text-accent">
                          {stat.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href="/stats"
                    className="link-rule mt-4 inline-block text-xs text-muted"
                  >
                    Refreshed every half hour
                  </Link>
                </StaggerItem>
              ) : null}
            </Stagger>
          </div>

          {/* Portrait. Circular, and built into the backdrop rather than
              dropped on top of it: a slowly rotating dashed ring and a
              travelling marker orbit the frame, and an inner hairline
              sits just inside the edge. Aligned to the top of the column
              so it reads with the name rather than sinking below it.

              The photograph itself is left alone. It previously carried
              two tints that pulled it toward the palette — a
              `saturate-[0.82]` filter and an accent-coloured soft-light
              wash — both of which lifted on hover. They read as the
              image being dimmed rather than as a deliberate treatment,
              so the picture is now shown at its natural colour and only
              the scale still responds to hover. The accent glow behind
              the frame stays: it sits *around* the portrait, not on it,
              and is what ties the circle to the backdrop. */}
          <motion.div
            data-entrance=""
            className="order-1 flex justify-center lg:order-2 lg:justify-end lg:self-start lg:pt-4"
            initial={reduced ? false : { opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              reduced ? { duration: 0 } : { duration: 1, ease: EASE, delay: 0.5 }
            }
          >
            <div className="flex flex-col items-center gap-7">
              <div className="group relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-10 rounded-full opacity-80 blur-2xl"
                  style={{
                    // `--glow-wash`, not `--accent-wash`: this is light
                    // behind the portrait, and in light mode the accent
                    // is darker than the page, so the accent token drew
                    // a shadow here instead of a halo.
                    background:
                      "radial-gradient(circle, var(--glow-wash) 0%, transparent 70%)",
                  }}
                />

                {/* orbiting dashed ring */}
                <motion.svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  className="absolute -inset-5 h-[calc(100%+2.5rem)] w-[calc(100%+2.5rem)]"
                  animate={reduced ? undefined : { rotate: 360 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 90, ease: "linear", repeat: Infinity }
                  }
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="0.4"
                    strokeDasharray="1.5 4"
                    opacity="0.55"
                  />
                  <circle cx="50" cy="2" r="1.6" fill="var(--accent)" />
                </motion.svg>

                <div className="relative h-44 w-44 overflow-hidden rounded-full border border-line sm:h-56 sm:w-56 lg:h-[20rem] lg:w-[20rem]">
                  <Image
                    src="/profile_pic.jpeg"
                    alt={`${site.name}, portrait`}
                    fill
                    sizes="(min-width: 1024px) 20rem, (min-width: 640px) 14rem, 11rem"
                    // `transition-transform` rather than `transition-all`:
                    // scale is the only thing that moves now, and naming
                    // it keeps the animation on the compositor.
                    className="scale-105 object-cover transition-transform duration-700 ease-out group-hover:scale-100"
                    priority
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full border border-canvas/25"
                  />
                </div>
              </div>

              {/* The places someone actually goes to check the work — the
                  same four the résumé header links to.
                  Set as text on a hairline rather than as icon buttons:
                  icons would be the only chrome of their kind on the page,
                  and the type is already doing this job everywhere else.
                  Email and the résumé are deliberately not repeated here —
                  they sit beside the name a column away. */}
              <nav
                aria-label="Profiles"
                className="flex w-full max-w-[17rem] items-center justify-between gap-4 border-t border-line pt-4"
              >
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-rule text-xs text-muted"
                  >
                    {social.label}
                  </a>
                ))}
              </nav>
            </div>
          </motion.div>
        </div>
      </Shell>
    </section>
  );
}
