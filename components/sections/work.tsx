import { Section, Lead } from "@/components/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { projects } from "@/content/projects";

/**
 * Ledger entries, not cards: full measure, separated by a hairline, with
 * a brass rule that grows down the left edge on hover. The interaction
 * is the only motion here, because it answers the pointer.
 */
export function Work() {
  return (
    <Section id="work" label="Selected work" meta={`${projects.length} projects`}>
      <Reveal>
        {/* Not "then kept running": only one of the two is deployed
            anywhere, and the other's whole point is what it does when it
            stops running. */}
        <Lead>Two things I built end to end, down to the failure modes.</Lead>
      </Reveal>

      <Stagger className="mt-12" stagger={0.12}>
        {projects.map((project) => (
          <StaggerItem
            as="article"
            key={project.name}
            className="group relative border-t border-line py-10 first:border-t-0 first:pt-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-10 -left-6 hidden h-0 w-px origin-top bg-accent transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:h-[calc(100%-5rem)] md:block"
            />

            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
              <h3 className="font-display text-2xl font-normal text-ink transition-colors duration-500 group-hover:text-accent md:text-3xl">
                {project.name}
              </h3>
              <p className="text-2xs text-muted">
                {project.stack.join(", ")}
              </p>
            </div>

            <p className="mt-5 max-w-[62ch] text-base text-ink/90">
              {project.summary}
            </p>

            <ul className="mt-5 max-w-[68ch] space-y-2.5">
              {project.points.map((point) => (
                <li
                  key={point.slice(0, 40)}
                  className="relative pl-5 text-sm text-ink/80 before:absolute before:top-[0.62em] before:left-0 before:h-px before:w-2.5 before:bg-line"
                >
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-x-10 gap-y-3">
              {project.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-rule text-sm text-ink"
                >
                  {link.label}
                  <span className="ml-2 text-xs text-muted">
                    {link.display}
                  </span>
                </a>
              ))}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
