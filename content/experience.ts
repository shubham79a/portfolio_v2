export interface Role {
  company: string;
  title: string;
  location: string;
  /** Rail text. Kept as written so the timeline reads as real dates. */
  period: string;
  /** Sort/eyebrow value for the rail's year marker */
  year: string;
  current?: boolean;
  /**
   * Anything still bracketed as [INSERT_…] is skipped by the UI rather
   * than rendered, so a missing link never ships as a dead one.
   */
  certificateUrl?: string;
  points: string[];
}

export const experience: Role[] = [
  {
    company: "Practitionist",
    title: "Full Stack Developer Intern",
    location: "Remote",
    period: "September 2025 — May 2026",
    year: "2026",
    points: [
      "Architected a multi-service booking engine — consultations, subscriptions, webinars and classes — handling session allocation, availability windows and conflict-aware rescheduling across overlapping schedules.",
      "Designed a multi-layer booking constraint system: weekly and monthly frequency caps, plan duration, session validity and subscription quotas, all enforced server-side so overbooking and quota bypass are impossible from the client.",
      "Built role-based REST APIs across four dashboards (Admin, Staff, Consultant, Consultee) with permission control at both the route and the resource level, cutting booking failure rates by 30% through systematic edge-case handling.",
      "Integrated payment gateway flows and server-side caching on availability lookups, reducing repeated database reads on the hottest endpoint and improving API response times by 15%.",
    ],
  },
  {
    company: "Ziovy",
    title: "Full Stack Developer Intern",
    location: "Remote",
    period: "May 2025 — July 2025",
    year: "2025",
    points: [
      "Built an admin platform for rewards, engagement and campaign management, integrating GraphQL APIs for real-time metrics and runtime-configurable campaign rules across two production releases.",
      "Reduced dashboard data-fetch latency by 35% by consolidating multiple GraphQL requests and asking for only the fields each view actually rendered.",
    ],
  },
];
