import { Shell } from "@/components/section";
import { site, socials } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <Shell>
        <div className="flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-lg text-ink">{site.name}</p>
            <p className="mt-1 text-xs text-muted">
              {site.role}, {site.location}
            </p>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-rule text-xs text-muted"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="border-t border-line py-6 text-2xs text-muted">
          © {new Date().getFullYear()} {site.name}. Set in Fraunces and General
          Sans.
        </p>
      </Shell>
    </footer>
  );
}
