import Link from "next/link";
import { Section, Lead } from "@/components/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { achievements } from "@/content/achievements";

export interface LiveAchievement {
  figure: string;
  detail: string;
}

/**
 * `live` carries current figures for the one entry that has them. It is
 * optional so the section still renders correctly if every platform is
 * down — it simply falls back to the written text.
 */
export function Achievements({ live }: { live?: LiveAchievement }) {
  return (
    <Section id="achievements" label="Recognition" meta="Contests and rankings">
      <Reveal>
        <Lead>Results I can point at, rather than adjectives.</Lead>
      </Reveal>

      <Stagger as="div" className="mt-12" stagger={0.08}>
        <dl>
        {achievements.map((entry) => {
          const item =
            entry.id === "competitive" && live
              ? { ...entry, figure: live.figure, detail: live.detail }
              : entry;
          return (
          <StaggerItem
            key={item.title}
            className="grid gap-x-gutter gap-y-1 border-t border-line py-7 md:grid-cols-[13rem_1fr]"
          >
            <dt className="font-display text-lg font-light text-accent">
              {item.figure}
            </dt>
            <dd>
              <p className="text-base text-ink">{item.title}</p>
              <p className="mt-1 max-w-[56ch] text-sm text-muted">
                {item.detail}
              </p>
            </dd>
          </StaggerItem>
          );
        })}
        </dl>
      </Stagger>

      <Reveal delay={0.1}>
        <p className="mt-8 text-sm text-muted">
          These are point-in-time results.{" "}
          <Link href="/stats" className="link-rule text-ink">
            The live record
          </Link>{" "}
          pulls current ratings and solve counts straight from each platform.
        </p>
      </Reveal>
    </Section>
  );
}
