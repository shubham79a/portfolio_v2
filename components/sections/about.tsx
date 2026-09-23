import { Section, Lead } from "@/components/section";
import { Reveal } from "@/components/motion";
import { education } from "@/content/site";

export function About() {
  return (
    <Section id="about" label="About" meta="IIIT Ranchi, 2023–2027">
      <Reveal>
        <Lead>
          I like the part of this job where something has to survive contact
          with real users.
        </Lead>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="space-y-5 text-base text-ink/80">
            <p>
              I&rsquo;m in my last year of computer science at IIIT Ranchi, and
              most of what I actually know came from shipping things that then
              had to keep working. I build platforms across the stack, which in
              practice means the interface and the machinery behind it are the
              same job. At Practitionist that meant a booking engine for
              consultations, subscriptions, webinars and classes &mdash;
              availability windows, conflict-aware rescheduling, and a
              constraint layer of frequency caps, plan durations and
              subscription quotas, all enforced on the server because a rule
              a client can skip is not a rule.
            </p>
            <p>
              The same job also meant role-based APIs across four dashboards
              with permissions checked at the route and at the resource, which
              took booking failures down by 30%, and caching on the
              availability lookup that every other screen depended on, which
              took 15% off response times. Before that, at Ziovy, I built an
              admin platform for rewards and campaigns and cut dashboard
              latency by 35%, mostly by asking GraphQL for the fields each view
              actually rendered rather than everything it could.
            </p>
          </div>

          <div className="space-y-5 text-base text-ink/80">
            <p>
              Left to my own devices I go looking for the failure modes. That
              is what QueueFlow is: a distributed job queue built on raw Redis
              primitives instead of a library, so that at-least-once delivery,
              crash recovery and idempotency were mine to get right. Its test
              suite SIGKILLs workers mid-job, and the result I care about is
              320 jobs with zero lost and zero duplicated, proven by
              side-effect rows rather than by hoping.
            </p>
            <p>
              The other half of my time goes to competitive programming
              &mdash; LeetCode, Codeforces and CodeChef, 800+ problems and a
              Knight badge so far. It&rsquo;s the same instinct as the
              engineering work: a problem, a hard constraint, and no credit for
              a solution that only holds on the easy input. I&rsquo;m looking
              for a software developer internship or a graduate role where that
              gets used.
            </p>

            <dl className="border-t border-line pt-5 text-sm">
              <dt className="text-xs text-muted">Studying</dt>
              <dd className="mt-1 text-ink">{education.institution}</dd>
              <dd className="mt-1 text-muted">{education.degree}</dd>
              {/* Set at display size rather than trailing the degree line.
                  A CGPA is an early filter in graduate hiring, so it is
                  worth being legible at a glance. */}
              <dd className="mt-4 flex items-baseline gap-2.5">
                <span className="font-display text-3xl leading-none font-light text-accent">
                  {education.cgpa}
                </span>
                <span className="text-xs text-muted">
                  {education.cgpaScale} CGPA &middot; {education.period}
                </span>
              </dd>
            </dl>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
