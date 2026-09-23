import * as cheerio from "cheerio";
import {
  REQUEST_TIMEOUT_MS,
  type ActivityDay,
  type Badge,
  type CodeChefStats,
  type RatingPoint,
} from "./types";

/**
 * CodeChef publishes no API of any kind, so this parses the public
 * profile page. It is the most fragile of the four sources by a wide
 * margin: any markup change upstream will null it out.
 *
 * That is handled rather than hidden — every field is independently
 * optional, a parse miss yields null instead of throwing, and /stats
 * renders an honest "unavailable" line for the platform instead of a
 * blank card or a crash.
 */
export async function getCodeChef(
  handle: string
): Promise<CodeChefStats | null> {
  try {
    const res = await fetch(
      `https://www.codechef.com/users/${encodeURIComponent(handle)}`,
      {
        headers: {
          // Served the bot version otherwise.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          Accept: "text/html",
        },
        cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
    if (!res.ok) throw new Error(`CodeChef: HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // The rating graph is driven by a JS array embedded in the page.
    // It is the only route to contest history, since there is no API.
    let history: RatingPoint[] = [];
    const raw = /var\s+all_rating\s*=\s*(\[[\s\S]*?\]);/.exec(html);
    if (raw) {
      try {
        const rows = JSON.parse(raw[1]) as {
          rating: string;
          name: string;
          rank: string;
          end_date: string;
        }[];
        history = rows
          .map((r) => ({
            t: Math.floor(new Date(r.end_date.replace(" ", "T") + "Z").getTime() / 1000),
            rating: Number.parseInt(r.rating, 10),
            label: r.name,
            rank: Number.parseInt(r.rank, 10) || null,
          }))
          .filter((p) => Number.isFinite(p.rating) && Number.isFinite(p.t));
      } catch {
        // A malformed array costs the trend line, not the whole platform.
        history = [];
      }
    }

    // The profile page feeds its heatmap from an inline array. Dates
    // arrive unpadded ("2024-9-13"), so they are normalised to ISO
    // before anything downstream tries to compare them.
    let activity: ActivityDay[] = [];
    const heat = /userDailySubmissionsStats\s*=\s*(\[[\s\S]*?\]);/.exec(html);
    if (heat) {
      try {
        const rows = JSON.parse(heat[1]) as { date: string; value: number }[];
        activity = rows
          .map((r) => {
            const [y, m, d] = r.date.split("-").map(Number);
            if (!y || !m || !d) return null;
            const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            return { date: iso, count: Number(r.value) || 0 };
          })
          .filter((r): r is ActivityDay => r !== null && r.count > 0);
      } catch {
        // A malformed array costs the heatmap contribution, not the
        // whole platform.
        activity = [];
      }
    }

    const int = (raw: string | undefined): number | null => {
      if (!raw) return null;
      const digits = raw.replace(/[^\d]/g, "");
      if (!digits) return null;
      const n = Number.parseInt(digits, 10);
      return Number.isFinite(n) ? n : null;
    };

    const rating = int($(".rating-number").first().text());

    // Rendered as "(Highest Rating 1672)" next to the current rating.
    const maxRating = int(
      /Highest Rating\s*([\d]+)/.exec($(".rating-header").first().text())?.[1]
    );

    // One <span> per filled star.
    const starSpans = $(".rating-star").first().find("span").length;
    const stars = starSpans > 0 ? starSpans : null;

    const solved = int(
      /Total Problems Solved:\s*([\d]+)/.exec($.root().text())?.[1]
    );

    // Badges live in a widget of their own, each a title plus the
    // threshold that earned it.
    const badges: Badge[] = [];
    $(".widget.badges .badge__title, .badge__title").each((_, el) => {
      const name = $(el).text().trim();
      if (name) {
        const tier = /(Gold|Silver|Bronze|Platinum|Diamond)/i.exec(name)?.[1];
        badges.push({
          name: name.replace(/\s*-\s*(Gold|Silver|Bronze|Platinum|Diamond)?\s*Badge$/i, "").trim(),
          platform: "CodeChef",
          date: null,
          tier: tier ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() : null,
        });
      }
    });

    const rankText = $(".rating-ranks").first().find("a strong");
    const globalRank = int(rankText.eq(0).text());
    const countryRank = int(rankText.eq(1).text());

    // A page that yields no rating at all is a parse failure, not a user
    // with no rating — report it as unavailable.
    if (rating === null && stars === null && solved === null) {
      throw new Error("CodeChef: profile markup did not parse");
    }

    return {
      handle,
      rating,
      maxRating,
      stars,
      solved,
      globalRank,
      countryRank,
      contests: history.length,
      history,
      badges,
      activity,
    };
  } catch {
    return null;
  }
}
