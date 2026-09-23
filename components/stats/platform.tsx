import * as simpleIcons from "simple-icons";
import type { ReactNode } from "react";

interface IconData {
  path: string;
}

function lookup(slug: string | null): IconData | null {
  if (!slug) return null;
  const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  const icon = (simpleIcons as unknown as Record<string, IconData | undefined>)[
    key
  ];
  return icon ?? null;
}

/**
 * A platform reads as a ledger row: mark, name and handle in the rail,
 * figures in a plain definition grid to the right. No card, no shadow -
 * the hairline above it is the whole container.
 */
export function Platform({
  name,
  handle,
  href,
  icon,
  children,
}: {
  name: string;
  handle: string;
  href: string;
  icon: string | null;
  children: ReactNode;
}) {
  const mark = lookup(icon);

  return (
    <div className="grid gap-x-gutter gap-y-6 border-t border-line py-9 lg:grid-cols-[13rem_1fr]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-muted">
          {mark ? (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="currentColor"
            >
              <path d={mark.path} />
            </svg>
          ) : (
            <span className="font-display text-[10px] leading-none">
              {name.slice(0, 2)}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <h3 className="text-base text-ink">{name}</h3>
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="link-inline mt-1 inline-block text-sm"
          >
            {handle}
          </a>
        </span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * A row of figures inside a platform block.
 *
 * `staleSince` is set when the platform did not answer on the last
 * refresh and these numbers are being carried forward. Saying so is the
 * whole point of keeping them: an old reading is more useful than a
 * blank, but only if it is not passed off as current.
 */
export function Readings({
  items,
  staleSince,
}: {
  items: { label: string; value: string }[];
  staleSince?: string | null;
}) {
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col-reverse">
            <dt className="mt-2 text-xs text-muted">{item.label}</dt>
            <dd className="font-display text-xl leading-none font-light text-ink">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {staleSince ? (
        <p className="mt-6 max-w-[52ch] text-sm text-muted">
          Didn&rsquo;t answer on the last refresh. These are the last good
          figures, read {staleSince} IST.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Shown when a platform's fetch failed. Says what happened rather than
 * rendering an empty block or zeros that would read as real figures.
 */
export function Unavailable({ platform }: { platform: string }) {
  return (
    <p className="max-w-[52ch] text-sm text-muted">
      {platform} didn&rsquo;t respond on the last refresh, so there&rsquo;s
      nothing current to show here. The rest of this page is unaffected, and
      this section will fill back in on the next successful check.
    </p>
  );
}
