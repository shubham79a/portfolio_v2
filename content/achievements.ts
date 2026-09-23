export interface Achievement {
  /**
   * Set on the entry whose figures are also fetched live. The UI swaps in
   * the current numbers when it has them, so this file cannot drift out
   * of step with /stats — which is a real risk here: the written text
   * below says 1871 and top 5.6%, and the live reading already differs,
   * because a contest rating moves every weekend.
   */
  id?: "competitive";
  /** The measurable part, set large — the reason the line exists */
  figure: string;
  /** What the figure refers to */
  title: string;
  /** Context, one line */
  detail: string;
  year?: string;
  /**
   * 0–1, how full the meter on /stats reads. An editorial judgement of
   * how far each result went, not a computed statistic — which is why
   * the real figure always sits beside the bar.
   */
  weight?: number;
}

export const achievements: Achievement[] = [
  {
    id: "competitive",
    figure: "Knight",
    title: "LeetCode",
    detail: "Contest rating 1871, top 5.6% globally.",
    year: "2026",
    weight: 0.94,
  },
  {
    figure: "800+",
    title: "Problems solved",
    detail: "Across LeetCode, Codeforces, CodeChef and HackerRank.",
    weight: 0.82,
  },
  {
    figure: "3★",
    title: "CodeChef",
    detail: "Peak rating 1611.",
    weight: 0.7,
  },
  {
    figure: "Member",
    title: "House of Geeks",
    detail: "The coding club at IIIT Ranchi.",
    weight: 0.45,
  },
];
