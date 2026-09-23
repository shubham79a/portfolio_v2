import type { ReactNode } from "react";
import { AnimatedText, Reveal } from "@/components/motion";
import { cn } from "@/lib/utils";

interface SectionProps {
  id: string;
  /** The section heading. Sentence case, small, in the left rail. */
  label: string;
  /** A real datum for the rail — a count, a span of years. Optional. */
  meta?: string;
  children: ReactNode;
  className?: string;
  /**
   * Rendered after the grid at the section's own full width, outside the
   * page gutters. Used for edge-to-edge content like the skills
   * marquee, which would otherwise need `100vw` — and `100vw` ignores
   * the scrollbar, which is how horizontal overflow gets in.
   */
  bleed?: ReactNode;
}

/**
 * The page's one structural primitive: a narrow left rail carrying the
 * heading, and a wide right column carrying the content, separated from
 * what came before by a single hairline.
 *
 * The rail label is the real <h2>. It is small and quiet on purpose —
 * the content is the loud part — but the document outline stays correct.
 */
export function Section({
  id,
  label,
  meta,
  children,
  className,
  bleed,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 border-t border-line", className)}
    >
      <Shell>
        <div
          className={cn(
            "grid gap-y-10 pt-20 md:grid-cols-[var(--spacing-rail)_1fr] md:gap-x-gutter md:pt-section",
            bleed ? "pb-0" : "pb-20 md:pb-section"
          )}
        >
          <Reveal className="md:sticky md:top-28 md:self-start">
            <h2 className="text-sm text-muted">{label}</h2>
            {meta ? <p className="mt-2 text-xs text-muted">{meta}</p> : null}
          </Reveal>
          <div className="min-w-0">{children}</div>
        </div>
      </Shell>
      {bleed ? <div className="pb-20 md:pb-section">{bleed}</div> : null}
    </section>
  );
}

/** Shared page gutter. Max width is set by measure, not by a breakpoint. */
export function Shell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[76rem] px-6 md:px-10", className)}>
      {children}
    </div>
  );
}

/**
 * The opening line of a section, in the display face. Sets the terms
 * before the detail arrives. Body copy elsewhere stays under ~72ch.
 */
export function Lead({ children }: { children: string }) {
  return (
    <AnimatedText
      text={children.replace(/\s+/g, " ").trim()}
      className="font-display max-w-[34ch] text-lg font-light text-ink sm:text-xl md:text-2xl"
    />
  );
}
