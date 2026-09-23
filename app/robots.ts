import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/**
 * Rendered once at build to a static /robots.txt. Nothing here runs per
 * request.
 *
 * `/api/` is disallowed as hygiene rather than protection — the refresh
 * route is already gated by a bearer token — so a crawler never spends
 * its budget on an endpoint that can only answer 401.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
