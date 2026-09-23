import * as simpleIcons from "simple-icons";
import { Section, Lead } from "@/components/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { skills, type Skill } from "@/content/skills";

interface IconData {
  path: string;
  title: string;
}

/**
 * simple-icons exports one object per brand, keyed `si` + PascalCase
 * slug. Resolving on the server means only the handful of path strings
 * actually used are inlined into the HTML - the package never reaches
 * the client bundle.
 */
function lookup(slug: string | null): IconData | null {
  if (!slug) return null;
  const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  const icon = (simpleIcons as unknown as Record<string, IconData | undefined>)[
    key
  ];
  return icon ?? null;
}

function SkillCard({ skill }: { skill: Skill }) {
  const icon = lookup(skill.icon);

  return (
    <div className="group flex h-full items-center gap-3 rounded-xl border border-line bg-accent-wash px-4 py-3 transition-colors duration-300 hover:border-accent">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-muted transition-colors duration-300 group-hover:border-accent group-hover:text-accent">
        {icon ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[18px] w-[18px]"
            fill="currentColor"
          >
            <path d={icon.path} />
          </svg>
        ) : (
          <span className="font-display text-xs leading-none font-normal">
            {skill.name.slice(0, 2)}
          </span>
        )}
      </span>

      {/* `break-words` (overflow-wrap), never `break-all`. The two are
          not interchangeable: `break-all` splits every word at the
          margin, which is what once turned "Docker" into "Docke / r".
          `overflow-wrap: break-word` only ever breaks a word that
          cannot fit on a line *by itself*, so ordinary names still wrap
          at their spaces and nothing changes at comfortable widths.

          This is the safety net, not the fix. The real fix was moving
          the grid's column steps off `md` — but a single unbreakable
          name longer than its card would still escape at some width,
          and silently, so it is worth making that structurally
          impossible. */}
      <span className="min-w-0 text-sm leading-snug break-words text-ink transition-colors duration-300 group-hover:text-accent">
        {skill.name}
      </span>
    </div>
  );
}

/**
 * Skills, grouped the way they are actually thought about — and on a
 * phone, one group at a time.
 *
 * This replaced a pair of infinite marquees. Two things were wrong with
 * those. The obvious one is that nothing scrolling past you can be
 * scanned: someone checking whether you know Postgres had to wait for it
 * to come around. The less obvious one is that a seamless loop has to
 * render its contents twice — so forty skills became eighty cards, and
 * their brand icons were the single heaviest thing on the homepage.
 *
 * The category chips are radio inputs, not React state. Every group is
 * in the HTML either way; CSS decides which one shows below md. That
 * keeps this a server component, which matters because the icons are
 * inlined SVG paths — going client-side would ship all of them a second
 * time in the flight payload.
 *
 * Reveal is per group rather than per tile. `Stagger` puts one observer
 * on the container and drives its children through variants, so six
 * groups cost six observers rather than forty — the same reasoning as
 * the heatmap drawing its cells as five paths instead of hundreds of
 * elements.
 */
export function Skills() {
  const total = skills.reduce((n, group) => n + group.items.length, 0);

  return (
    <Section id="skills" label="Skills" meta={`${total} tools and topics`}>
      <Lead>What I reach for, roughly in the order I reach for it.</Lead>

      <div data-skills className="mt-12">
        {/* Chips double as the tab strip on small screens and disappear
            entirely on desktop, where every group is shown at once. */}
        {/* Each radio physically fills its own chip rather than being
            parked off to one side.

            That is what stops the page jumping. A visually-hidden input
            still takes focus when its label is clicked, and the browser
            scrolls whatever just took focus into view — so with the
            inputs collected at the start of the row, choosing a category
            threw you back up to the chips. An input that covers the chip
            you just tapped is already on screen, so there is nothing to
            scroll to.

            Styling hangs off `has-[:checked]` on the label rather than
            `peer-checked`. `peer-*` compiles to the `~` sibling
            combinator, which matches *every* later sibling: with six
            inputs and six labels flat in one row, selecting the third
            chip lit up the third, fourth, fifth and sixth at once. */}
        <div className="flex flex-wrap gap-2 md:hidden">
          {skills.map((group, i) => (
            <label
              key={group.label}
              className="relative cursor-pointer rounded-full border border-line px-3.5 py-1.5 text-xs text-muted transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-canvas has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
            >
              <input
                type="radio"
                name="skill-group"
                data-tab={i}
                defaultChecked={i === 0}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={group.label}
              />
              {group.label}
            </label>
          ))}
        </div>

        <div className="mt-8 space-y-10 md:mt-0">
          {skills.map((group, i) => (
            <div key={group.label} data-group={i}>
              <Reveal delay={Math.min(i * 0.04, 0.16)}>
                {/* The chip already names the group on a phone, so the
                    heading would only repeat it. */}
                <div className="hidden items-baseline gap-4 md:flex">
                  <h3 className="text-sm text-ink">{group.label}</h3>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  <span className="text-2xs text-muted">
                    {group.items.length}
                  </span>
                </div>

                <Stagger
                  as="ul"
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-5 lg:grid-cols-3 xl:grid-cols-4"
                  stagger={0.045}
                >
                  {group.items.map((skill) => (
                    <StaggerItem as="li" key={skill.name}>
                      <SkillCard skill={skill} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
