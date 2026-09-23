import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/**
 * Rendered once at build to a static /sitemap.xml.
 *
 * Only `lastModified` is set. `changeFrequency` and `priority` are in
 * the spec but Google has said for years that it ignores both, so
 * setting them would be documenting an intent nothing reads.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: site.url, lastModified },
    { url: `${site.url}/stats`, lastModified },
  ];
}
