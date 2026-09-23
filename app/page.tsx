import { Hero, type HeroLiveStat } from "@/components/hero";
import { About } from "@/components/sections/about";
import { Experience } from "@/components/sections/experience";
import { Work } from "@/components/sections/work";
import { Skills } from "@/components/sections/skills";
import { Achievements } from "@/components/sections/achievements";
import { Contact } from "@/components/sections/contact";
import { PersonSchema } from "@/components/person-schema";
import {
  getStats,
  liveAchievement,
  totalSolved,
  STATS_REVALIDATE,
} from "@/lib/stats";
import { formatNumber, round } from "@/lib/utils";

/**
 * The homepage is otherwise static, but the hero footnote reads the same
 * cached platform data as /stats, so it revalidates on the same clock.
 * Nothing here blocks on the network: a visitor always gets the last
 * pre-rendered page.
 */
/**
 * Next requires this to be a literal it can read statically, so it
 * cannot be the imported constant. The type annotation is the guard: if
 * STATS_REVALIDATE ever changes, this line stops compiling.
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

export default async function HomePage() {
  const stats = await getStats();

  /**
   * Only figures that actually came back are shown. A platform that is
   * down simply drops out of the hero rather than rendering a dash.
   *
   * These are the aggregate and the two peaks rather than one platform's
   * current rating apiece. Two reasons. A total is legible to a reader
   * who does not follow competitive programming, where "1,304
   * Codeforces" is not, and peak ratings are how these results are
   * conventionally stated. The second reason is structural: peaks are
   * covered by the monotonic guard in the snapshot merge, so a broken
   * scrape freezes them at their last good value. Current ratings are
   * deliberately outside that guard, because they can genuinely fall.
   *
   * Nothing here costs an extra request. Every field is already in the
   * snapshot that the scheduled refresh stores, so this is the same one
   * read the page was already doing.
   */
  const live: HeroLiveStat[] = [];
  const solved = totalSolved(stats);
  if (solved > 0) {
    live.push({ label: "Problems solved", value: formatNumber(solved) });
  }
  if (stats.leetcode?.maxContestRating) {
    live.push({
      label: "LeetCode peak",
      value: formatNumber(round(stats.leetcode.maxContestRating)),
    });
  }
  if (stats.codechef?.maxRating) {
    live.push({
      label: "CodeChef peak",
      value: formatNumber(round(stats.codechef.maxRating)),
    });
  }

  // The competitive-programming achievement quotes numbers that are also
  // fetched live, so it is built from the same data rather than from the
  // written copy. /stats derives it from the same helper, so the two
  // pages cannot drift apart.
  const liveAward = liveAchievement(stats);

  return (
    <>
      <PersonSchema />
      <Hero live={live} />
      <About />
      <Experience />
      <Work />
      <Skills />
      <Achievements live={liveAward} />
      <Contact />
    </>
  );
}
