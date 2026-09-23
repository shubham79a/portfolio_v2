import * as simpleIcons from "simple-icons";
import { Stagger, StaggerItem } from "@/components/motion";
import { formatNumber } from "@/lib/utils";

interface IconData {
  path: string;
}

function lookup(slug: string | null): IconData | null {
  if (!slug) return null;
  const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  return (
    (simpleIcons as unknown as Record<string, IconData | undefined>)[key] ?? null
  );
}

export interface RatingCard {
  name: string;
  icon: string | null;
  handle: string;
  href: string;
  current: number | null;
  peak: number | null;
  /** Rank title, star count, or whatever the platform calls its tier */
  tier: string | null;
  contests: number;
}

/**
 * The three rated platforms side by side, each with its own profile
 * link. Ratings live in the switchable chart too, but that shows one
 * platform at a time — this is the view that answers "where does he
 * stand everywhere" in a single glance.
 */
export function ContestRatings({ cards }: { cards: RatingCard[] }) {
  return (
    <Stagger
      /* Drops back to one column at `md` on purpose. That is where the
         Section grows its 11rem rail, taking 224px out of the content
         column — so two cards at 768px are narrower than two cards at
         760px, and the three-up figures inside them stop fitting. */
      className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
      stagger={0.09}
    >
      {cards.map((card) => {
        const icon = lookup(card.icon);
        return (
          <StaggerItem key={card.name} className="h-full">
            <div className="group flex h-full flex-col rounded-2xl border border-line bg-surface/70 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent hover:bg-surface">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-canvas text-muted transition-colors duration-300 group-hover:border-accent group-hover:text-accent">
                  {icon ? (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d={icon.path} />
                    </svg>
                  ) : (
                    <span className="font-display text-xs leading-none">
                      {card.name.slice(0, 2)}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-base leading-tight text-ink">
                    {card.name}
                  </p>
                  <p className="text-2xs text-muted">{card.handle}</p>
                </div>
              </div>

              <p className="font-display mt-7 text-4xl leading-none font-light text-ink">
                {card.current ? formatNumber(card.current) : "—"}
              </p>
              <p className="mt-2 text-xs text-muted">Current rating</p>

              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
                <div>
                  <dt className="text-2xs text-muted">Peak</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {card.peak ? formatNumber(card.peak) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs text-muted">Tier</dt>
                  <dd className="mt-1 text-sm text-ink">{card.tier ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-muted">Contests</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatNumber(card.contests)}
                  </dd>
                </div>
              </dl>

              <a
                href={card.href}
                target="_blank"
                rel="noreferrer noopener"
                className="link-inline mt-6 inline-block text-sm"
              >
                View profile
              </a>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
