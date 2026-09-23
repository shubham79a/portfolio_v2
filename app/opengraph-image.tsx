import { ImageResponse } from "next/og";
import { education, site } from "@/content/site";

/**
 * The link-preview card: what LinkedIn, WhatsApp, Slack and X render
 * when the site's URL is pasted. Without one, a shared link shows as a
 * bare URL and a line of text, which for a portfolio used in job
 * applications is a real cost.
 *
 * Generated once at build into a static PNG under /opengraph-image.
 * Nothing about it runs when a visitor loads the page — the only
 * runtime artefact is one `<meta property="og:image">` tag.
 *
 * Colours are the light theme's tokens as literals, because this is
 * rendered outside the browser and has no access to CSS variables. If
 * the palette in globals.css changes, this should follow it.
 */
export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#e4ded0";
const INK = "#221d16";
const MUTED = "#675e50";
const ACCENT = "#6b4a3a";

export default function Image() {
  // Satori requires any element with several children to be an explicit
  // flex container, and counts adjacent text nodes as several children —
  // so lines are assembled as single strings first.
  const school = education.institution.replace(
    "Indian Institute of Information Technology",
    "IIIT"
  );
  const footnote = `${school} · Class of 2027 · CGPA ${education.cgpa}`;
  const host = site.url.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: BG,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {site.name}
          </div>
          <div
            style={{
              marginTop: 34,
              width: 220,
              height: 2,
              background: ACCENT,
            }}
          />
          {/* Kept word for word in step with the hero line — this card is
              the first thing a shared link shows, and the page it opens
              should not greet the reader with a different sentence. */}
          <div style={{ marginTop: 34, fontSize: 40, color: INK }}>
            I build backends that stay correct when things go wrong.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 26,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: ACCENT, fontSize: 30 }}>{site.role}</div>
            <div>{footnote}</div>
          </div>
          <div>{host}</div>
        </div>
      </div>
    ),
    size
  );
}
