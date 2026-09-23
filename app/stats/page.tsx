import type { Metadata } from "next";
import Link from "next/link";
import { Shell, Section, Lead } from "@/components/section";
import { AnimatedText, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { Figure } from "@/components/stats/figure";
import { Donut, type Band } from "@/components/stats/donut";
import { RatingPanel } from "@/components/stats/rating-panel";
import { Platform, Readings, Unavailable } from "@/components/stats/platform";
import { ContestRatings, type RatingCard } from "@/components/stats/contest-ratings";
import { Awards, type Award } from "@/components/stats/awards";
import { TopicChart } from "@/components/stats/topics";
import { BadgeWall } from "@/components/stats/badge-wall";
import { Heatmap } from "@/components/stats/heatmap";
import { Languages } from "@/components/stats/languages";
import { achievements } from "@/content/achievements";
import {
  getStats,
  heatmapWindowStart,
  liveAchievement,
  staleSources,
  totalSolved,
  STATS_REVALIDATE,
  type RatingSeries,
} from "@/lib/stats";
import { handles } from "@/content/site";
import { formatNumber, formatTimestamp, listJoin, round } from "@/lib/utils";

/**
 * Same clock as the homepage. The page is pre-rendered and served from
 * the cache; a visitor never triggers or waits on a platform fetch.
 * See the note on app/page.tsx for why this is a literal.
 */
/**
 * Both routes are prerendered and must stay that way. The seed path in
 * getStats() performs uncached fetches on a completely empty store, and
 * without this Next would read those and downgrade the whole page to
 * on-demand rendering — turning every visit into a server render. This
 * pins the page to the static path; the seed is a one-time build-time
 * cost, and after that the page is rebuilt only by the scheduled refresh.
 */
export const dynamic = "force-static";

export const revalidate: typeof STATS_REVALIDATE = 1800;

export const metadata: Metadata = {
  title: "Coding record",
  description:
    "Live competitive-programming figures for Shubham Kumar, pulled directly from LeetCode, Codeforces, CodeChef and GitHub.",
  alternates: { canonical: "/stats" },
};

/** One counted figure in the GitHub section. */
interface GitHubFigure {
  value: number;
  label: string;
  note?: string;
}

/**
 * A platform with no handle in content/site.ts is not part of this
 * profile, and saying "unavailable" about it would be a lie of a
 * particular kind: it reads as "this platform is down", when the truth
 * is that there is nothing to read. Those sections are omitted instead,
 * and reappear the moment a handle is filled in.
 */
const configured = Object.values(handles).filter(Boolean).length;
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five"];
const platformCount = NUMBER_WORDS[configured] ?? String(configured);

export default async function StatsPage() {
  const stats = await getStats();
  const solved = totalSolved(stats);
  const updated = formatTimestamp(stats.fetchedAt);

  // Switchable trend lines — only platforms that came back with enough
  // history to draw are offered.
  const series: (RatingSeries | null)[] = [
    stats.leetcode && stats.leetcode.history.length > 1
      ? {
          id: "leetcode",
          name: "LeetCode",
          icon: "leetcode",
          current: stats.leetcode.contestRating
            ? round(stats.leetcode.contestRating)
            : null,
          peak: stats.leetcode.maxContestRating
            ? round(stats.leetcode.maxContestRating)
            : null,
          contests: stats.leetcode.history.length,
          points: stats.leetcode.history,
        }
      : null,
    stats.codechef && stats.codechef.history.length > 1
      ? {
          id: "codechef",
          name: "CodeChef",
          icon: "codechef",
          current: stats.codechef.rating,
          peak: stats.codechef.maxRating,
          contests: stats.codechef.history.length,
          points: stats.codechef.history,
        }
      : null,
    stats.codeforces && stats.codeforces.history.length > 1
      ? {
          id: "codeforces",
          name: "Codeforces",
          icon: "codeforces",
          current: stats.codeforces.rating,
          peak: stats.codeforces.maxRating,
          contests: stats.codeforces.history.length,
          points: stats.codeforces.history,
        }
      : null,
  ];

  const active = series.filter((s): s is RatingSeries => s !== null);

  const contests = active.reduce((sum, s) => sum + s.contests, 0);

  // DSA problems — LeetCode and Code360 both report by difficulty.
  const dsa: Band[] = [
    {
      label: "Easy",
      value: (stats.leetcode?.easy ?? 0) + (stats.code360?.easy ?? 0),
      tone: "soft",
    },
    {
      label: "Medium",
      value: (stats.leetcode?.medium ?? 0) + (stats.code360?.medium ?? 0),
      tone: "mid",
    },
    {
      label: "Hard",
      value: (stats.leetcode?.hard ?? 0) + (stats.code360?.hard ?? 0),
      tone: "full",
    },
  ];
  const dsaTotal = dsa.reduce((a, b) => a + b.value, 0);

  // Competitive judges report a flat solved count, not a difficulty mix.
  const cp: Band[] = [
    { label: "Codeforces", value: stats.codeforces?.solved ?? 0, tone: "full" },
    { label: "CodeChef", value: stats.codechef?.solved ?? 0, tone: "mid" },
  ];
  const cpTotal = cp.reduce((a, b) => a + b.value, 0);

  // The combined view: DSA practice against rated-contest problems.
  const combined: Band[] = [
    { label: "DSA practice", value: dsaTotal, tone: "mid" },
    { label: "Competitive judges", value: cpTotal, tone: "full" },
  ];

  // Ratings as their own set of cards, each with a profile link.
  const ratingCardSlots: (RatingCard | null)[] = [
    stats.leetcode?.contestRating
      ? {
          name: "LeetCode",
          icon: "leetcode",
          handle: handles.leetcode,
          href: `https://leetcode.com/u/${handles.leetcode}/`,
          current: round(stats.leetcode.contestRating),
          peak: stats.leetcode.maxContestRating
            ? round(stats.leetcode.maxContestRating)
            : null,
          tier: stats.leetcode.topPercentage
            ? `Top ${stats.leetcode.topPercentage.toFixed(1)}%`
            : null,
          contests: stats.leetcode.contestsAttended ?? 0,
        }
      : null,
    stats.codechef?.rating
      ? {
          name: "CodeChef",
          icon: "codechef",
          handle: handles.codechef,
          href: `https://www.codechef.com/users/${handles.codechef}`,
          current: stats.codechef.rating,
          peak: stats.codechef.maxRating,
          tier: stats.codechef.stars ? `${stats.codechef.stars}★` : null,
          contests: stats.codechef.contests,
        }
      : null,
    stats.codeforces?.rating
      ? {
          name: "Codeforces",
          icon: "codeforces",
          handle: handles.codeforces,
          href: `https://codeforces.com/profile/${handles.codeforces}`,
          current: stats.codeforces.rating,
          peak: stats.codeforces.maxRating,
          tier: stats.codeforces.rank
            ? stats.codeforces.rank.replace(/^\w/, (c) => c.toUpperCase())
            : null,
          contests: stats.codeforces.contests,
        }
      : null,
  ];

  const ratingCards = ratingCardSlots.filter(
    (c): c is RatingCard => c !== null
  );

  // The same live override the homepage applies. Without it this page —
  // the one that promises current figures — rendered the written
  // fallback and disagreed with the homepage on the same achievement.
  const live = liveAchievement(stats);
  const awards: Award[] = achievements.map((a) => ({
    ...a,
    ...(a.id === "competitive" && live
      ? { figure: live.figure, detail: live.detail }
      : {}),
    weight: a.weight ?? 0.6,
  }));

  // Platforms whose numbers are being carried forward from an earlier
  // successful read, so the page can say so instead of implying they are
  // current.
  const stale = staleSources(stats);

  // Only the window the picker can actually reach is sent to the
  // browser. Every figure above the grid is computed server-side from
  // the full history, so nothing is lost by withholding the rest — and
  // this is the one payload on the page that would otherwise grow with
  // every year of activity.
  const heatmapDays = stats.activity
    ? stats.activity.days.filter(
        (d) => d.date >= heatmapWindowStart(stats.activity!.today)
      )
    : [];

  const gh = stats.github;
  const githubFigures: GitHubFigure[] = gh
    ? ([
        {
          value: gh.totalContributions,
          label: "Total contributions",
          note: gh.createdYear ? `Since ${gh.createdYear}` : undefined,
        },
        {
          value: gh.totalActiveDays,
          label: "Total active days",
          note: `${gh.longestStreak}-day longest streak`,
        },
        gh.stars !== null
          ? {
              value: gh.stars,
              label: "Stars earned",
              note: `Across ${formatNumber(gh.publicRepos)} public repositories`,
            }
          : null,
        gh.commits !== null
          ? { value: gh.commits, label: "Commits", note: "Authored, all repos" }
          : null,
        gh.pullRequests !== null
          ? { value: gh.pullRequests, label: "Pull requests", note: "Opened anywhere" }
          : null,
        gh.issues !== null
          ? { value: gh.issues, label: "Issues", note: "Opened anywhere" }
          : null,
      ] as (GitHubFigure | null)[]).filter((f): f is GitHubFigure => f !== null)
    : [];


  // GitHub keeps its own grid: its contributions are not problems
  // solved, so folding them into the judge heatmap would overstate what
  // "active days" means on this page.


  return (
    <>
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <Shell>
          <Reveal>
            <p className="text-xs text-muted">The record</p>
          </Reveal>
          <AnimatedText
            as="h1"
            text="Everything, counted"
            className="font-display mt-5 max-w-[18ch] text-[2.4rem] leading-[1.02] font-light tracking-tight text-ink sm:text-4xl md:text-5xl"
            onMount
            delay={0.15}
            stagger={0.05}
          />
          <Stagger className="mt-8" delay={0.55} stagger={0.12}>
            <StaggerItem>
              <p className="max-w-[58ch] text-base text-ink/80">
                Competitive programming keeps its own scoreboard, so there is
                no reason for me to summarise it by hand. These figures come
                straight from each platform and refresh on their own every
                thirty minutes.
              </p>
            </StaggerItem>
            <StaggerItem className="mt-4">
              <p className="max-w-[58ch] text-sm text-muted">
                Last updated {updated} IST.{" "}
                <Link href="/" className="link-inline">
                  Back to the portfolio
                </Link>
              </p>
            </StaggerItem>
            {stale.length > 0 ? (
              <StaggerItem className="mt-3">
                <p className="max-w-[58ch] text-sm text-muted">
                  Carried forward from the last good reading:{" "}
                  {listJoin(
                    stale.map((s) => `${s.name} (${formatTimestamp(s.since)})`)
                  )}
                  .
                </p>
              </StaggerItem>
            ) : null}
          </Stagger>
        </Shell>
      </section>

      <Section
        id="totals"
        label="At a glance"
        meta={`Across ${platformCount} platforms`}
      >
        <Stagger
          className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4"
          stagger={0.09}
        >
          {solved > 0 ? (
            <StaggerItem>
              <Figure
                value={solved}
                label="Problems solved"
                note="Across every judge below"
              />
            </StaggerItem>
          ) : null}

          {contests > 0 ? (
            <StaggerItem>
              <Figure
                value={contests}
                label="Contests attended"
                note={active.map((s) => `${s.name} ${s.contests}`).join(", ")}
              />
            </StaggerItem>
          ) : null}

          {stats.leetcode?.contestRating ? (
            <StaggerItem>
              <Figure
                value={round(stats.leetcode.contestRating)}
                label="LeetCode rating"
                note={
                  stats.leetcode.topPercentage
                    ? `Top ${stats.leetcode.topPercentage.toFixed(1)}% globally`
                    : undefined
                }
              />
            </StaggerItem>
          ) : null}

          {stats.activity ? (
            <StaggerItem>
              <Figure
                value={stats.activity.totalActiveDays}
                label="Active days"
                note={`All time, across ${listJoin(stats.activity.sources)}`}
              />
            </StaggerItem>
          ) : null}
        </Stagger>
      </Section>

      <Section
        id="trend"
        label="Rating over time"
        meta={`${contests} rated contests`}
      >
        <Lead>Every rated contest, on whichever platform you pick.</Lead>
        {active.length > 0 ? (
          <Reveal delay={0.08} className="mt-10">
            <RatingPanel series={active} />
          </Reveal>
        ) : (
          <div className="mt-8">
            <Unavailable platform="Every rating platform" />
          </div>
        )}
      </Section>

      <Section id="breakdown" label="Problems" meta="By difficulty and by judge">
        <Lead>Where the solved problems actually sit.</Lead>

        {solved > 0 ? (
          <Reveal className="mt-10 border-b border-line pb-12">
            <h3 className="mb-6 text-sm text-muted">
              Everything combined
            </h3>
            <Donut bands={combined} total={solved} caption="total" />
          </Reveal>
        ) : null}

        <div className="mt-12 grid gap-x-gutter gap-y-12 lg:grid-cols-2">
          <Reveal>
            <h3 className="mb-6 text-sm text-muted">
              Data structures and algorithms
            </h3>
            {dsaTotal > 0 ? (
              <Donut bands={dsa} total={dsaTotal} caption="solved" />
            ) : (
              <Unavailable
                platform={handles.code360 ? "LeetCode and Code360" : "LeetCode"}
              />
            )}
          </Reveal>

          <Reveal delay={0.1}>
            <h3 className="mb-6 text-sm text-muted">Competitive programming</h3>
            {cpTotal > 0 ? (
              <Donut bands={cp} total={cpTotal} caption="solved" />
            ) : (
              <Unavailable platform="Codeforces and CodeChef" />
            )}
          </Reveal>
        </div>
      </Section>

      {stats.activity ? (
        <Section
          id="activity"
          label="Activity"
          meta={`${formatNumber(stats.activity.totalSubmissions)} submissions counted`}
        >
          <Lead>Every day something was submitted, on any judge.</Lead>

          <Stagger className="mt-10 flex flex-wrap gap-x-12 gap-y-6" stagger={0.08}>
            {[
              {
                label: "Total active days",
                value: stats.activity.totalActiveDays,
              },
              { label: "Current streak", value: stats.activity.currentStreak },
              {
                label: "Longest streak",
                value: stats.activity.longestStreak,
              },
            ].map((r) => (
              <StaggerItem key={r.label}>
                <div className="flex flex-col-reverse">
                  <dt className="mt-2 text-xs text-muted">{r.label}</dt>
                  <dd className="font-display text-3xl leading-none font-light text-ink">
                    {formatNumber(r.value)}
                  </dd>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.08} className="mt-10 w-full min-w-0">
            <Heatmap days={heatmapDays} today={stats.activity.today} />
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-8 max-w-[62ch] text-sm text-muted">
              The three figures above are all-time totals and do not change
              with the period shown below. Days are unioned rather than
              summed, so working on two judges on the same date counts
              once. Only {listJoin(stats.activity.sources)} publish per-day
              activity; the other platforms are not represented here.
            </p>
          </Reveal>
        </Section>
      ) : null}

      {stats.badges.length > 0 ? (
        <Section
          id="badges"
          label="Badges"
          meta={`${stats.badges.length} earned`}
        >
          <Lead>Badges the judges handed out along the way.</Lead>
          <Reveal delay={0.06} className="mt-10">
            <BadgeWall badges={stats.badges} />
          </Reveal>
        </Section>
      ) : null}

      {stats.leetcode && stats.leetcode.topics.length > 0 ? (
        <Section
          id="topics"
          label="Topic analysis"
          meta={`${stats.leetcode.topics.length} tags with at least one solve`}
        >
          <Lead>Which corners of the subject I have actually spent time in.</Lead>
          <Reveal delay={0.06} className="mt-10">
            <TopicChart topics={stats.leetcode.topics} limit={10} />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-[62ch] text-sm text-muted">
              Tag counts come from LeetCode, the one platform of the five that
              publishes a per-topic breakdown.
            </p>
          </Reveal>
        </Section>
      ) : null}

      <Section
        id="github"
        label="GitHub"
        meta={
          gh?.createdYear ? `Public work since ${gh.createdYear}` : "Public work"
        }
      >
        <Lead>What the work looks like away from the judges.</Lead>

        {gh ? (
          <>
            <Stagger
              className="mt-10 grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-3"
              stagger={0.08}
            >
              {githubFigures.map((figure) => (
                <StaggerItem key={figure.label}>
                  <Figure
                    value={figure.value}
                    label={figure.label}
                    note={figure.note}
                  />
                </StaggerItem>
              ))}
            </Stagger>

            {gh.languages.length > 0 ? (
              <Reveal delay={0.08} className="mt-16">
                <h3 className="mb-8 text-sm text-muted">
                  Languages, by share of code written
                </h3>
                <Languages languages={gh.languages} />
                <p className="mt-10 max-w-[62ch] text-sm text-muted">
                  {gh.languagesExact
                    ? "Shares are real byte counts summed across every public repository I own, which is why a handful of large notebooks can outweigh a lot of small scripts."
                    : "Shares are weighted from each repository’s primary language and size — the reading available without an API token, and close rather than exact."}
                </p>
              </Reveal>
            ) : null}
          </>
        ) : (
          <div className="mt-8">
            <Unavailable platform="GitHub" />
          </div>
        )}
      </Section>

      <Section
        id="ratings"
        label="Contest ratings"
        meta="Current and peak, per platform"
      >
        <Lead>Where each rating actually stands today.</Lead>
        {ratingCards.length > 0 ? (
          <div className="mt-10">
            <ContestRatings cards={ratingCards} />
          </div>
        ) : (
          <div className="mt-8">
            <Unavailable platform="Every rating platform" />
          </div>
        )}
      </Section>

      <Section
        id="awards"
        label="Recognition"
        meta={`${awards.length} results`}
      >
        <Lead>Contest results, measured by how far they went.</Lead>
        <div className="mt-10">
          <Awards awards={awards} />
        </div>
      </Section>

      <Section id="platforms" label="By platform" meta={`Updated ${updated} IST`}>
        <Stagger stagger={0.08}>
          <StaggerItem>
            <Platform
              name="LeetCode"
              handle={handles.leetcode}
              icon="leetcode"
              href={`https://leetcode.com/u/${handles.leetcode}/`}
            >
              {stats.leetcode ? (
                <Readings
                  staleSince={
                    stats.meta.leetcode?.stale
                      ? formatTimestamp(stats.meta.leetcode.updatedAt)
                      : null
                  }
                  items={[
                    {
                      label: "Solved",
                      value: formatNumber(stats.leetcode.solved),
                    },
                    {
                      label: "Contest rating",
                      value: stats.leetcode.contestRating
                        ? formatNumber(round(stats.leetcode.contestRating))
                        : "—",
                    },
                    {
                      label: "Contests",
                      value: stats.leetcode.contestsAttended
                        ? formatNumber(stats.leetcode.contestsAttended)
                        : "—",
                    },
                    {
                      label: "Global rank",
                      value: stats.leetcode.globalRanking
                        ? formatNumber(stats.leetcode.globalRanking)
                        : "—",
                    },
                  ]}
                />
              ) : (
                <Unavailable platform="LeetCode" />
              )}
            </Platform>
          </StaggerItem>

          <StaggerItem>
            <Platform
              name="CodeChef"
              handle={handles.codechef}
              icon="codechef"
              href={`https://www.codechef.com/users/${handles.codechef}`}
            >
              {stats.codechef ? (
                <Readings
                  staleSince={
                    stats.meta.codechef?.stale
                      ? formatTimestamp(stats.meta.codechef.updatedAt)
                      : null
                  }
                  items={[
                    {
                      label: "Rating",
                      value: stats.codechef.rating
                        ? formatNumber(stats.codechef.rating)
                        : "—",
                    },
                    {
                      label: "Peak",
                      value: stats.codechef.maxRating
                        ? formatNumber(stats.codechef.maxRating)
                        : "—",
                    },
                    {
                      label: "Stars",
                      value: stats.codechef.stars
                        ? `${stats.codechef.stars}★`
                        : "—",
                    },
                    {
                      label: "Solved",
                      value: stats.codechef.solved
                        ? formatNumber(stats.codechef.solved)
                        : "—",
                    },
                  ]}
                />
              ) : (
                <Unavailable platform="CodeChef" />
              )}
            </Platform>
          </StaggerItem>

          <StaggerItem>
            <Platform
              name="Codeforces"
              handle={handles.codeforces}
              icon="codeforces"
              href={`https://codeforces.com/profile/${handles.codeforces}`}
            >
              {stats.codeforces ? (
                <Readings
                  staleSince={
                    stats.meta.codeforces?.stale
                      ? formatTimestamp(stats.meta.codeforces.updatedAt)
                      : null
                  }
                  items={[
                    {
                      label: "Rating",
                      value: stats.codeforces.rating
                        ? formatNumber(stats.codeforces.rating)
                        : "Unrated",
                    },
                    {
                      label: "Peak",
                      value: stats.codeforces.maxRating
                        ? formatNumber(stats.codeforces.maxRating)
                        : "—",
                    },
                    {
                      label: "Rank",
                      value: stats.codeforces.rank
                        ? stats.codeforces.rank.replace(/^\w/, (c) =>
                            c.toUpperCase()
                          )
                        : "—",
                    },
                    {
                      label: "Solved",
                      value: formatNumber(stats.codeforces.solved),
                    },
                  ]}
                />
              ) : (
                <Unavailable platform="Codeforces" />
              )}
            </Platform>
          </StaggerItem>

          {handles.code360 ? (
            <StaggerItem>
              <Platform
                name="Code360"
                handle="Naukri Code360"
                icon={null}
                href={`https://www.naukri.com/code360/profile/${handles.code360}`}
              >
                {stats.code360 ? (
                  <Readings
                    staleSince={
                      stats.meta.code360?.stale
                        ? formatTimestamp(stats.meta.code360.updatedAt)
                        : null
                    }
                    items={[
                      {
                        label: "Solved",
                        value: formatNumber(stats.code360.solved),
                      },
                      {
                        label: "Easy",
                        value: formatNumber(stats.code360.easy),
                      },
                      {
                        label: "Moderate",
                        value: formatNumber(stats.code360.medium),
                      },
                      { label: "Level", value: stats.code360.level ?? "—" },
                    ]}
                  />
                ) : (
                  <Unavailable platform="Code360" />
                )}
              </Platform>
            </StaggerItem>
          ) : null}

          <StaggerItem>
            <Platform
              name="GitHub"
              handle={handles.github}
              icon="github"
              href={`https://github.com/${handles.github}`}
            >
              {stats.github ? (
                <Readings
                  staleSince={
                    stats.meta.github?.stale
                      ? formatTimestamp(stats.meta.github.updatedAt)
                      : null
                  }
                  items={[
                    {
                      label: "Contributions, 12mo",
                      value: formatNumber(stats.github.contributions),
                    },
                    {
                      label: "Current streak",
                      value: `${stats.github.currentStreak}d`,
                    },
                    {
                      label: "Longest streak",
                      value: `${stats.github.longestStreak}d`,
                    },
                    {
                      label: "Public repos",
                      value: formatNumber(stats.github.publicRepos),
                    },
                  ]}
                />
              ) : (
                <Unavailable platform="GitHub" />
              )}
            </Platform>
          </StaggerItem>
        </Stagger>

        <Reveal delay={0.1}>
          <p className="mt-10 max-w-[62ch] text-sm text-muted">
            A scheduled job reads every platform on its own every thirty
            minutes and stores the result, and these pages render from that
            store — so nothing here is fetched while you wait, and freshness
            doesn&rsquo;t depend on anyone happening to visit. LeetCode,
            Codeforces and GitHub are read from public APIs. CodeChef
            publishes none, so its numbers are scraped from the profile page
            and are the most likely to go quiet. When a platform does go quiet
            its last good reading is kept and labelled with the date it was
            taken, rather than being dropped or passed off as current.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
