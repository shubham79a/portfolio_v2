/**
 * Each entry carries a simple-icons slug so the Skills grid can render a
 * real mark. `icon: null` means the concept has no logo (it isn't a
 * product), and the grid falls back to a typographic monogram rather
 * than an approximate or unrelated glyph.
 *
 * Every slug below was checked against the installed simple-icons build.
 * BullMQ and REST have no brand mark in it, so they are null rather than
 * borrowing someone else's.
 */
export interface Skill {
  name: string;
  /** simple-icons slug, or null where no brand mark exists */
  icon: string | null;
}

export interface SkillGroup {
  label: string;
  items: Skill[];
}

export const skills: SkillGroup[] = [
  {
    label: "Languages",
    items: [
      { name: "C++", icon: "cplusplus" },
      { name: "Python", icon: "python" },
      { name: "TypeScript", icon: "typescript" },
      { name: "JavaScript", icon: "javascript" },
      { name: "SQL", icon: null },
    ],
  },
  {
    label: "Backend",
    items: [
      { name: "Node.js", icon: "nodedotjs" },
      { name: "Express.js", icon: "express" },
      { name: "NestJS", icon: "nestjs" },
      { name: "FastAPI", icon: "fastapi" },
      { name: "REST", icon: null },
      { name: "GraphQL", icon: "graphql" },
      { name: "Socket.io", icon: "socketdotio" },
      { name: "BullMQ", icon: null },
      { name: "Prisma", icon: "prisma" },
      { name: "Drizzle ORM", icon: "drizzle" },
    ],
  },
  {
    label: "Frontend",
    items: [
      { name: "Next.js", icon: "nextdotjs" },
      { name: "React.js", icon: "react" },
      { name: "Redux", icon: "redux" },
      { name: "TanStack Query", icon: "reactquery" },
    ],
  },
  {
    label: "Databases",
    items: [
      { name: "PostgreSQL", icon: "postgresql" },
      { name: "MySQL", icon: "mysql" },
      { name: "MongoDB", icon: "mongodb" },
      { name: "Redis", icon: "redis" },
    ],
  },
  {
    label: "Tools and platforms",
    items: [
      { name: "Docker", icon: "docker" },
      { name: "Nginx", icon: "nginx" },
      { name: "Git", icon: "git" },
      { name: "GitHub", icon: "github" },
      { name: "Postman", icon: "postman" },
      { name: "Google Cloud Platform", icon: "googlecloud" },
    ],
  },
  {
    label: "Core CS",
    items: [
      { name: "Data structures and algorithms", icon: null },
      { name: "DBMS", icon: null },
      { name: "Operating systems", icon: null },
      { name: "Computer networks", icon: null },
      { name: "Object-oriented programming", icon: null },
    ],
  },
];
