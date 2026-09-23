import { education, site, socials } from "@/content/site";

/**
 * schema.org `Person`, as JSON-LD, on the homepage.
 *
 * This is the piece of SEO that actually bears on a *name* search. A
 * page about someone competes with their LinkedIn, GitHub and judge
 * profiles, all on domains with enormous authority. What this block
 * does is tell Google that those profiles and this site are the same
 * entity — `sameAs` is the field it uses to connect them — so the site
 * is understood as the person's own page rather than one more mention
 * of the name.
 *
 * Costs nothing at runtime: `application/ld+json` is data, not script,
 * so the browser never parses or executes it. A few hundred bytes of
 * HTML, rendered once at build.
 *
 * Deliberately omits the phone number and email. Neither affects
 * ranking, both are already on the page for a human to find, and a
 * structured field is far easier for a scraper to harvest than prose.
 */
export function PersonSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    url: site.url,
    image: `${site.url}/profile_pic.jpeg`,
    jobTitle: site.role,
    description:
      "Software developer and competitive programmer. B.Tech Computer Science and Engineering at IIIT Ranchi, class of 2027.",
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: education.institution,
    },
    knowsAbout: [
      "Software development",
      "Competitive programming",
      "Data structures and algorithms",
      "TypeScript",
      "Node.js",
      "Next.js",
      "React",
      "PostgreSQL",
      "Redis",
      "Docker",
    ],
    sameAs: socials.map((s) => s.href),
  };

  return (
    <script
      type="application/ld+json"
      // Every value above is a constant from content/site.ts, not user
      // input. `<` is still escaped so that no value could ever close
      // the script element early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
