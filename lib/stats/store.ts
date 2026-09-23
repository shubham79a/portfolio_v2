import { gunzipSync, gzipSync } from "node:zlib";
import { STORE_TIMEOUT_MS, type StatsSnapshot } from "./types";

/**
 * Where the last-known-good snapshot lives.
 *
 * The single most important thing about this file is *when* it runs. Both
 * pages are statically rendered and served from the CDN, so a visitor
 * receives HTML that was produced earlier — they never wait on a read
 * from here. The store is touched twice an hour by the background
 * refresh, and once more if a page happens to regenerate. Adding it
 * therefore costs the visitor exactly nothing, which is what makes
 * "cache the data" and "load instantly" compatible rather than opposed.
 *
 * Three drivers, tried in order:
 *
 *   1. Upstash Redis over its REST API. Chosen over a Redis client
 *      because REST is plain `fetch` — no dependency, no connection
 *      pooling, no cold-start handshake, and it works from any runtime.
 *      Vercel KV is Upstash underneath and sets KV_REST_API_*, so both
 *      names are accepted.
 *   2. A file in the OS temp directory. On Vercel this survives only as
 *      long as one warm instance, so it is a convenience for local
 *      development rather than real persistence.
 *   3. Memory. Correct for a single process, gone on restart.
 *
 * Nothing here throws. A store that is missing or broken degrades to
 * "no previous data", which the caller already handles as first-run.
 */

const KEY = "portfolio:stats:snapshot";

interface Upstash {
  url: string;
  token: string;
}

/**
 * `||`, not `??`. The two spellings exist so that either Vercel's or
 * Upstash's own naming works, and `??` broke that: it falls through only
 * on undefined, so a `KV_REST_API_URL` present but set to the empty
 * string — which is exactly what happens when .env.example's blank
 * placeholders get pasted into a hosting dashboard — silently *shadowed*
 * a correctly populated `UPSTASH_REDIS_REST_URL`. The store then reported
 * "memory" while the dashboard showed every variable set, which is the
 * most expensive kind of wrong. An empty credential is not a credential.
 */
function upstash(): Upstash | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export type StoreDriver = "upstash" | "file" | "memory";

/** Which driver is actually in use, for the health endpoint to report. */
export function storeDriver(): StoreDriver {
  if (upstash()) return "upstash";
  return process.env.VERCEL ? "memory" : "file";
}

/**
 * Snapshots are mostly per-day activity arrays, which compress roughly
 * tenfold. Gzipping keeps the payload comfortably clear of Upstash's
 * request size limit and makes the write cheap. The prefix lets a
 * value written by an older build still be read back.
 */
const GZIP_PREFIX = "gz:";

function pack(snapshot: StatsSnapshot): string {
  return GZIP_PREFIX + gzipSync(JSON.stringify(snapshot)).toString("base64");
}

function unpack(raw: string): StatsSnapshot | null {
  try {
    const json = raw.startsWith(GZIP_PREFIX)
      ? gunzipSync(Buffer.from(raw.slice(GZIP_PREFIX.length), "base64")).toString(
          "utf8"
        )
      : raw;
    const parsed = JSON.parse(json) as StatsSnapshot;
    // A snapshot that isn't shaped like one is treated as absent rather
    // than trusted — a half-written or stale-format value must never
    // reach the page as if it were data.
    if (!parsed || typeof parsed !== "object" || !parsed.platforms) return null;
    return parsed;
  } catch {
    return null;
  }
}

let memory: string | null = null;

async function filePath(): Promise<string> {
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  return join(tmpdir(), "shubham-portfolio-stats.json");
}

export async function readSnapshot(): Promise<StatsSnapshot | null> {
  const kv = upstash();
  if (kv) {
    try {
      const res = await fetch(`${kv.url}/get/${encodeURIComponent(KEY)}`, {
        headers: { Authorization: `Bearer ${kv.token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { result: string | null };
      return body.result ? unpack(body.result) : null;
    } catch {
      return null;
    }
  }

  if (!process.env.VERCEL) {
    try {
      const { readFile } = await import("node:fs/promises");
      return unpack(await readFile(await filePath(), "utf8"));
    } catch {
      // Falls through to memory: no file yet is the normal first run.
    }
  }

  return memory ? unpack(memory) : null;
}

/** Returns whether the write actually landed, so callers can report it. */
export async function writeSnapshot(snapshot: StatsSnapshot): Promise<boolean> {
  const payload = pack(snapshot);
  memory = payload;

  const kv = upstash();
  if (kv) {
    try {
      const res = await fetch(`${kv.url}/set/${encodeURIComponent(KEY)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kv.token}`,
          "Content-Type": "text/plain",
        },
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  if (!process.env.VERCEL) {
    try {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(await filePath(), payload, "utf8");
      return true;
    } catch {
      return false;
    }
  }

  return true; // memory only
}
