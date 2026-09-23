/**
 * Identity, links, and the competitive-programming handles that drive
 * /stats. Everything here is edited in one place; no component hardcodes
 * a handle, a URL, or an address.
 */

export const site = {
  name: "Shubham Kumar",
  /** Used for the wordmark and the browser tab */
  shortName: "Shubham Kumar",
  role: "Software developer",
  email: "shubh79.nolan@gmail.com",
  /**
   * Published deliberately, because it is already on the résumé this site
   * links to — withholding it here would only be theatre. Removing it is
   * a one-line change plus a redeploy, but a number that has already been
   * harvested stays harvested, so the decision is worth being deliberate
   * about.
   */
  phone: "+91 98718 05948",
  location: "Ranchi, India",
  /**
   * Canonical origin. Drives metadataBase, the sitemap, robots.txt, the
   * Person schema and the OG card footer, so it must be the domain this
   * deployment actually answers on.
   *
   * CHANGE THIS BEFORE DEPLOYING. It is a placeholder for the v2 Vercel
   * domain. Pointing it at another site makes every canonical tag on
   * these pages claim that site is the original.
   */
  url: "https://shubham-kumar.vercel.app",
  resume: "/resume.pdf",
} as const;

export interface SocialLink {
  label: string;
  href: string;
  /** Shown in muted text beside the label instead of an arrow glyph */
  display: string;
}

/** The four profiles the résumé header links to, in the same order. */
export const socials: SocialLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/shubham79a",
    display: "github.com/shubham79a",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/shubham-kumar-02a029387",
    display: "linkedin.com/in/shubham-kumar-02a029387",
  },
  {
    label: "LeetCode",
    href: "https://leetcode.com/u/shubham2927/",
    display: "leetcode.com/u/shubham2927",
  },
  {
    label: "Codolio",
    href: "https://codolio.com/profile/shubham79",
    display: "codolio.com/profile/shubham79",
  },
];

/**
 * Platform handles for /stats. Each was verified against the live API
 * before being written here — LeetCode and Codeforces both answer to
 * `shubham2927`, which is a coincidence of registration rather than a
 * rule, so they stay as separate fields.
 */
export const handles = {
  codeforces: "shubham2927",
  leetcode: "shubham2927",
  codechef: "shubhamnolan29",
  /**
   * Code360 addresses profiles by UUID, not by a handle. Empty because
   * there is no profile to read: fetchPlatforms skips the request
   * entirely rather than spending one on a URL that cannot resolve, and
   * the section on /stats renders its unavailable state. Paste a UUID
   * here and both start working on the next refresh.
   */
  code360: "",
  github: "shubham79a",
} as const;

export const education = {
  institution: "Indian Institute of Information Technology, Ranchi",
  degree: "B.Tech, Computer Science and Engineering",
  /**
   * Split out from the degree line so About can set it at display size
   * rather than burying it in a run-on. A CGPA is a filter for a lot of
   * graduate hiring, so it should be readable at a glance rather than
   * something a reader has to find.
   */
  cgpa: "8.15",
  cgpaScale: "/10",
  period: "2023–2027",
} as const;
