/**
 * X/Twitter reads `twitter:image` before falling back to `og:image`, and
 * not every client falls back. Same picture, emitted under both tags.
 */
export { default, alt, size, contentType } from "./opengraph-image";
