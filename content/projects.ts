export interface ProjectLink {
  label: string;
  href: string;
  /** Shown in muted type beside the label, in place of an arrow glyph */
  display: string;
}

export interface Project {
  name: string;
  /** One line, written to say what the thing *is* — not to sell it */
  summary: string;
  points: string[];
  stack: string[];
  links: ProjectLink[];
}

export const projects: Project[] = [
  {
    name: "QueueFlow",
    summary:
      "A distributed job queue built on raw Redis primitives rather than a library, so that every delivery guarantee in it is one I had to make myself.",
    points: [
      "HTTP producer, worker pool and scheduler over PostgreSQL as the system of record; one Docker image runs any role.",
      "At-least-once execution across worker crashes, via an atomic BLMOVE handoff, TTL heartbeats as the failure detector, and a reaper that requeues stranded jobs. Retries use exponential backoff with jitter into a dead-letter queue.",
      "Duplicate execution is made harmless by database-backed leases and idempotency keys. Chaos tests SIGKILL workers mid-job: 320 jobs, zero lost, zero duplicated, proven by side-effect rows — and benchmarked at ~1,000 jobs/s, bounded by the Postgres commit rate.",
      "Graceful shutdown so deploys drain in-flight work instead of routing it through crash recovery, plus a live React dashboard with keyset pagination, DLQ replay and operator auth.",
    ],
    stack: ["Node.js", "TypeScript", "Redis", "PostgreSQL", "Docker"],
    links: [
      {
        label: "Source",
        href: "https://github.com/shubham79a/QueueFlow",
        display: "github.com/shubham79a/QueueFlow",
      },
    ],
  },
  {
    name: "DevArcade",
    summary:
      "A coding-interview preparation platform that runs submitted code in several languages and tracks how far through a path you actually are.",
    points: [
      "Structured learning paths, chapter-wise progress tracking and subscription-gated content over a normalized PostgreSQL schema.",
      "Judge0 for multi-language execution (C++, Java, Python), handling asynchronous submission tokens, result polling and per-submission resource limits.",
      "Clerk authentication with subscription-tier authorization enforced server-side, so premium content cannot be reached by calling the API directly, plus an XP-based progression system.",
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Clerk", "Judge0"],
    links: [
      {
        label: "Live",
        href: "https://interview-os-three.vercel.app/",
        display: "interview-os-three.vercel.app",
      },
      {
        label: "Source",
        href: "https://github.com/shubham79a/dev-arcade",
        display: "github.com/shubham79a/dev-arcade",
      },
    ],
  },
];
