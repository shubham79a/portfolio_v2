# Shubham Kumar — portfolio

A single-page portfolio plus a live `/stats` route, built as a ledger
rather than a landing page: a narrow left rail carrying the heading and a
real datum, a wide right column carrying the content, and hairlines
instead of cards.

Next.js 16 (App Router), TypeScript in strict mode, Tailwind v4 with a
fully custom theme, Framer Motion, `next/font`. No CMS, no database, no
custom server.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Theme system

Two modes in one warm neutral-brown family, inverted in lightness. Six
custom properties, declared at `:root` and overridden under
`[data-theme="dark"]` in `app/globals.css`. **No component contains a
hex.** Tailwind utilities are readable aliases pointing at the same
properties (`bg-canvas`, `text-ink`, `text-muted`, `text-accent`,
`border-line`).

| Property        | Light — Warm stone | Dark — Espresso mono |
| --------------- | ------------------ | -------------------- |
| `--bg`          | `#E4DED0`          | `#1C1712`            |
| `--surface`     | `#EDE8DC`          | `#241D16`            |
| `--text`        | `#221D16` (12.5:1) | `#F2ECE0` (15.1:1)   |
| `--text-muted`  | `#675E50` (4.8:1)  | `#9C8F7C` (5.6:1)    |
| `--accent`      | `#6B4A3A` (5.9:1)  | `#C79B6E` (7.1:1)    |
| `--border`      | `#D3CBBA`          | `#33291E`            |

**One deliberate deviation from the spec.** Light `--text-muted` was
given as `#7C7364`, which measures **3.49:1** on `--bg` and fails WCAG AA
for anything under 24px — and it is used at 11–13px throughout. It is
darkened to `#675E50`, the nearest tone in the same family that passes at
4.76:1. Revert the one line in `globals.css` if you would rather have the
original value.

Three derived properties — `--accent-soft`, `--accent-mid`,
`--accent-wash` — are `color-mix`ed from `--accent` and `--bg`, so charts
and donuts get real values in both themes instead of borrowing opacity.

- The theme resolves in a **blocking inline script** in `<head>`
  (`components/theme-script.tsx`), before first paint, so there is no
  flash of the wrong theme. A post-mount effect would paint the default
  first.
- Default is the OS preference; the toggle overrides it and persists to
  `localStorage`; with no stored choice the page keeps following the OS
  live.
- **The switch is instant. Do not animate it.** Three approaches were
  built and measured on /stats at 4x CPU throttle, using
  `PerformanceObserver({entryTypes:['longtask']})` — not rAF gaps, which
  are meaningless while a view transition composites:

  | Approach | Longest blocking task |
  | --- | ---: |
  | Colour transition on every element | 13,552ms |
  | View Transitions circular wipe | ~350–425ms |
  | **Instant attribute flip (current)** | **82ms** |

  The wipe looked good, but the API has to capture two full-viewport
  snapshots and run a style recalc *before* its first frame, so on a long
  page there is a stall on click — the exact lag it was supposed to
  remove.

- **The real cost was never the toggle.** It was the hero backdrop, and
  fixing that mattered far more than any switching strategy:
  `blur-[120px]` filters stacked on radial gradients that were already
  soft (a 736px element blurred by 120px is an enormous convolution), and
  a cursor light that animated its `background` gradient *string*,
  repainting a viewport-sized element on every pointer move. Both are now
  transform-only. Homepage toggle went 806ms -> 145ms, /stats 213ms ->
  82ms, and the run-to-run spread collapsed.

- `content-visibility: auto` on off-screen sections was tried and
  **reverted**: it breaks anchor navigation, because the browser scrolls
  using `contain-intrinsic-size` estimates before real heights resolve.
  A jump to `#platforms` landed 1,271px off.
- The accent is intentionally muted, so **no interactive element is
  marked by colour alone** — `.link-rule` draws an underline on hover and
  focus, `.link-inline` keeps a permanent one inside running text.

The only hardcoded hexes outside `globals.css` are in
`viewport.themeColor` (`app/layout.tsx`), which sets the browser chrome
colour and must be a literal — CSS variables are not resolvable there.

**There is no shadow scale in the stylesheet.** Structure comes from
hairlines and vertical rhythm; a drop shadow is the first step back
toward a card grid.

**Type.** Fraunces for display, General Sans for body — one face each,
no third. Fraunces is loaded as the full variable file so its `opsz`,
`SOFT` and `WONK` axes are available, which is what lets the 96px hero be
drawn differently rather than merely scaled. General Sans is self-hosted
from `app/fonts/` (three weights, ~23KB each), so nothing is fetched from
Fontshare at runtime. Both go through `next/font`, so there is no flash
and no layout shift.

The site has no monospaced face. It does not need one: `body` sets
`font-variant-numeric: tabular-nums`, so every figure, rating and table
column aligns in the body face.

## Content

Everything editable lives in `content/`, typed and free of JSX:

- `site.ts` — name, email, socials, **platform handles**, education
- `experience.ts`, `projects.ts`, `skills.ts`, `achievements.ts`

Values that aren't known yet are written as `[INSERT_…]`. `isPlaceholder()`
in `lib/utils.ts` checks for that prefix and the UI skips those elements
rather than rendering a dead link. Currently outstanding:

- `site.url` — a placeholder domain. Set it to the real one before
  deploying: it drives `metadataBase`, the sitemap, `robots.txt`, the
  Person schema and the OG card, so a wrong value makes every canonical
  tag point at a site that isn't this one.
- `handles.code360` — empty, so no Code360 profile is read and the
  section is omitted from `/stats` rather than rendered as unavailable.
  Paste a UUID to switch it back on.
- `metadata.verification.google` in `app/layout.tsx` — absent. Add the
  token Search Console issues for this property.

## How freshness actually works

Nothing a visitor does causes a platform to be fetched. There is exactly
one code path that talks to Codeforces, LeetCode, CodeChef, Code360 or
GitHub, and it is the scheduled refresh in
`app/api/revalidate/route.ts`.

```
every 30 min          refreshStats()
                        ├─ fetch all five platforms in parallel
                        ├─ mergeSnapshot(): whatever answered replaces its
                        │   entry; whatever didn't keeps the one it had
                        ├─ writeSnapshot()  → the KV store
                        └─ revalidatePath('/'), revalidatePath('/stats')
                             └─ pages re-render, reading the snapshot

a visitor             static HTML from the CDN
                        └─ no store read, no fetch, no wait
```

**The store is never on a visitor's request path.** That is the whole
reason this design does not cost anything. Both pages are
`dynamic = "force-static"` with a 30-minute `revalidate`, so what a
browser receives is prerendered HTML. The snapshot is read while a page
is being *regenerated*, in the background, roughly twice an hour — not
once per visit. Adding persistence therefore made the site strictly more
robust at zero latency cost.

`force-static` is load-bearing, not decoration. `getStats()` has a seed
path that fetches live when the store is completely empty, which only
happens on a brand-new deployment. Those fetches are `no-store`, and
without the `force-static` pin Next notices them and downgrades both
routes to on-demand rendering — turning every visit into a server render.
The build output is the check: `/` and `/stats` must be listed as `○
(Static)` with a 30m revalidate.

### The store

`lib/stats/store.ts` picks a driver from the environment:

| Driver     | When                                             | Persistent          |
| ---------- | ------------------------------------------------ | ------------------- |
| `upstash`  | `KV_REST_API_URL` + `KV_REST_API_TOKEN` are set  | yes                 |
| `file`     | local development                                | yes, on that box    |
| `memory`   | deployed with no KV configured                   | **no**              |

Upstash is spoken to over its REST API with plain `fetch`, so there is no
dependency, no connection pool and no cold-start handshake. Vercel KV is
Upstash underneath and sets the same variable names, so either works.
Snapshots are gzipped before storage (~22 KB down to ~5.6 KB), which
keeps them far inside request-size limits.

**Without KV, a deployment silently loses the carry-forward.** The
memory driver is per-instance, so the cron's snapshot is not visible to
the process that renders the page. `/api/revalidate` reports which driver
is live in its `driver` field — check it after deploying.

### Scheduling

Vercel's **Hobby plan rejects any cron that fires more than once a day**
at deploy time, so `*/30 * * * *` in `vercel.json` fails the build. The
half-hourly cadence therefore lives outside the project, and it took two
attempts to find somewhere it actually runs.

GitHub Actions was the obvious answer — free, unrestricted, already in
the repo — and it does not work. Scheduled events were being *dropped*
rather than delayed: no queued runs ever appeared for the missing ticks,
and roughly 2 of an expected 14 fired in a seven-hour window. GitHub
documents that `schedule` "can be delayed during periods of high load"
and offers no guarantee, so this is behaviour, not misconfiguration.

The real cadence is now a **Cloudflare Worker cron trigger**
(`5,35 * * * *`), whose source is kept in `worker/`. It fires within the
scheduled minute, and the free plan's 100k+ daily invocations against
this worker's 48 make it effectively unmetered.

The other two schedulers stay, each for one specific job:

| | Schedule | Job |
| --- | --- | --- |
| Cloudflare Worker | every 30 min | the real cadence |
| `.github/workflows/refresh-stats.yml` | daily | **alerting** — Cloudflare sends no failure email, this fails loudly on a non-200 |
| `vercel.json` | daily | backstop if Cloudflare is removed |

Overlapping runs are harmless: both merge onto the same stored snapshot
and the merge is monotonic, so the later write wins and nothing
regresses.

The workflow needs two repository secrets, `SITE_URL` and `CRON_SECRET`;
the Worker needs the same two as environment variables.

Set `CRON_SECRET` in the Vercel project too. It matters more than it used
to: the route now performs writes and spends a rate-limit budget, so it
should not be freely triggerable.

### The refresh reports on itself

Two things about `/api/revalidate` exist so that a broken setup cannot
look like a working one.

**It returns before the pages finish rebuilding.** Measured locally, the
snapshot was stored in about five seconds while rebuilding both pages
took a further ~110s — past the function's 60s ceiling. Blocking on that
would have produced a timeout, a red workflow run and an alert email
every thirty minutes, all while the data had in fact been saved
correctly. The rebuild is therefore scheduled with `after()`, which runs
it once the response has been sent. If it is cut short, the pages still
regenerate on their own via the segment `revalidate`.

**A misconfigured deployment returns HTTP 500.** A deployment that cannot
see its KV credentials falls back to a per-instance variable the renderer
never reads. Everything still looks right — pages build, numbers are
current — but the carry-forward silently does nothing, and you would only
find out on the day a platform went down. So `driver === "memory"` in
production is reported as a failure; the workflow checks the status code,
so it becomes a red run and an email.

Only the misconfiguration is treated that way. A transient write failure
against a healthy configuration stays a success with `stored: false` in
the body — it self-heals on the next run, and paging someone every
thirty minutes through a brief Upstash blip would train them to ignore
the alert. The two cases are distinguishable:

| Situation | `driver` | `stored` | HTTP |
| --------- | -------- | -------- | ---- |
| Healthy | `upstash` | `true` | 200 |
| Credentials missing in production | `memory` | `true` | **500** |
| Credentials fine, store unreachable | `upstash` | `false` | 200 |

Because the pages no longer fetch anything themselves, the old
constraint — "the cron interval must stay longer than the fetch TTL" — is
gone. The schedule is now free to be whatever makes sense.

Anything on the homepage that quotes a live figure is derived from the
same `getStats()` call rather than written into `content/` — see the
`id: "competitive"` achievement. A contest rating moves every weekend, so
a figure typed into `content/` is wrong within days, and wrong in the
worst way: the same site states two different numbers on two pages.

## `/stats`

Live figures from five platforms, read by a scheduled job into a stored
snapshot and rendered from there.

Each platform fetch is `cache: "no-store"` — it only ever runs inside the
refresh, whose entire job is to observe the platform's current state.
Fallback is the snapshot's business, not the HTTP layer's. Both routes
declare a segment `revalidate`. Segment config has to be a literal
Next can read statically, so it can't be the imported constant; it's
written as `export const revalidate: typeof STATS_REVALIDATE = 1800`, and
the type annotation makes the file stop compiling if the shared constant
ever changes.

| Platform   | Source                                            | Auth        |
| ---------- | ------------------------------------------------- | ----------- |
| Codeforces | Official API (`user.info`, `user.rating`, `user.status`) | none |
| LeetCode   | Public GraphQL endpoint, incl. contest history     | none        |
| CodeChef   | HTML parse of the public profile — no API exists   | none        |
| Code360    | Public `user_details` JSON endpoint, by UUID       | none        |
| GitHub     | REST profile + the public contributions calendar   | optional    |

Rating history comes from three of them, which is what feeds the
switchable trend chart: Codeforces `user.rating`, LeetCode
`userContestRankingHistory`, and CodeChef's `all_rating` array embedded
in its profile page.

**Badges** come from all three judges that publish them: LeetCode
`matchedUser.badges`, Code360's `badges_hash`, and the badge widget on
CodeChef's profile page.

**Activity and the heatmap** merge per-day data from all four judges:

| Platform | Where the per-day data comes from |
| --- | --- |
| LeetCode | `userCalendar`, queried once per active year |
| Codeforces | `user.status` timestamps |
| CodeChef | the `userDailySubmissionsStats` array its profile page feeds its own heatmap from |
| Code360 | `public_section/profile/contributions?uuid=&start_date=&end_date=` — undocumented but public; it returns "Date is required" unless given an explicit range, which is what makes it look broken |

Days are *unioned, not summed* — working on two judges on one date is a
single active day — and `lib/stats/activity.ts` recomputes both streaks
from the merged set rather than trusting any one platform's figure.

**Day boundaries are IST, not UTC** (`TZ_OFFSET_MINUTES` in
`activity.ts`). "Active day" means a day *he* worked, so it follows his
calendar; under UTC anything submitted before 05:30 IST lands on the
previous day. This only affects sources handing over raw timestamps,
which is Codeforces alone — the other three arrive pre-bucketed.

The heatmap's last day is passed in from the server (`fetchedAt`) rather
than read from the clock during render: reading it client-side would be
impure and would let server and client disagree about "today", which is
a hydration mismatch.

`GITHUB_TOKEN` is honoured if set but is **not** required; it only raises
the REST rate limit. Contribution totals come from the public calendar
page, because they are not exposed by the REST API and the GraphQL API
that does expose them requires a token.

### Codeforces needs care

Its three calls are issued **sequentially with a 2.1s gap, not in
parallel**, and each retries once. Codeforces documents a limit of one
request per two seconds and returns intermittent 504s regardless — which
is not theoretical: firing them together dropped the platform out of a
regeneration during development, taking the rating chart, the contest
totals and the live achievement line with it. The delay is affordable
because it is only paid during background revalidation, never by a
visitor.

### Everything outbound is bounded

Every `fetch` in the data layer carries an `AbortSignal.timeout`, and
Codeforces additionally gets a whole-platform budget.

This was learned the hard way. The failure handling was written and
tested against platforms that *refuse* — a 404, a 500, a parse miss —
and it handled all of those. What it had never seen was a platform that
accepts the connection and then simply never answers. Codeforces did
exactly that, and with three sequential endpoints, three attempts each
and escalating backoff, one stall compounded to **156 seconds** and
overran the function's 60-second ceiling. An upstream hiccup became a
dead endpoint returning 504.

The lesson generalises past that one call: a scheduled job has to bound
its own work, and "handles failure" means nothing unless it includes
"never returns". The audit that followed found three more unbounded
calls, the worst being the snapshot read — which also runs while a page
is being regenerated, so a stalled store would have hung a render rather
than merely a refresh.

| Bound | Value | Applies to |
| ----- | ----- | ---------- |
| `REQUEST_TIMEOUT_MS` | 8s | every platform request |
| `CODEFORCES_BUDGET_MS` | 25s | all three Codeforces endpoints together |
| `STORE_TIMEOUT_MS` | 5s | snapshot read and write |
| `WARM_TIMEOUT_MS` | 25s | rebuilding one page after a refresh |

Codeforces' budget is the one worth explaining. Its retry logic was
written before the snapshot existed, when losing the platform meant
losing the rating chart and the live achievement line outright, so almost
any delay was worth it. That trade inverted once readings carry forward:
giving up quickly now costs a stale label on real figures, while holding
on costs the entire refresh. Worst case is a deterministic ~33s: the
budget is a scheduling deadline rather than a hard stop, so a request
started just inside the 25s mark still gets its full 8s.

### When a platform goes down

Every getter catches its own failures and resolves to `null`, so one
platform can never reject the render or fail the build. What happens next
is `mergeSnapshot()` in `lib/stats/snapshot.ts`, and it is the reason
this site is more robust than reading the platforms directly.

The rule is: **a platform that answers replaces its entry; a platform
that doesn't keeps the one it had, labelled with the date it was taken.**
The qualifications on that rule each exist because the naive version
would eventually show a wrong number:

- **Nothing regresses to unknown.** A field that comes back `null` where
  we already had a value is a partial response, not news. Codeforces
  answers three endpoints independently and any one can 504 alone, so a
  reading can arrive with a live rating history but no rank at all.
- **Monotonic counters never fall.** Nobody un-solves a problem, so a
  drop in `solved`, `maxRating`, `totalContributions` or `stars` means
  the source changed shape and the parser is now reading the wrong
  element. Holding the previous value turns a silent wrong number into a
  stalled one, which is the failure you can actually notice. Current
  rating, current streak, follower count and CodeChef stars are
  deliberately excluded — those can legitimately fall.
- **Append-only arrays never shrink.** A shorter `history`, `topics` or
  `badges` list is a partial read, not a correction.
- **Activity days are unioned.** LeetCode only reports years it considers
  active and CodeChef only ever showed a window, so replacing rather than
  unioning would make "total active days" go *down* over time.
- **Partial reads are rejected outright** where a proportion is involved.
  Counting eighteen of twenty-nine repositories does not give a rougher
  language breakdown, it gives a confidently wrong one, so the pass is
  abandoned and the previous shares kept.
- **Carrying forward expires.** Past `STALE_LIMIT_DAYS` (21) the reading
  is dropped and the section says it is unavailable, so the page can
  never quietly present numbers from a profile unreachable for a month.
  The stored timestamp does not slide on each failed attempt, so repeated
  outages still expire on schedule.

Anything carried forward is labelled twice: once in the intro
("Carried forward from the last good reading: CodeChef (1 Sept, 08:19)")
and once in that platform's ledger row. An old reading is more useful
than a blank, but only if it is not passed off as current.

CodeChef is the fragile one by a wide margin, since it is scraped; the
parser treats every field as independently optional and reports a total
parse miss as unavailable rather than as zero.

The merge rules are covered by `npm run test:stats`, which exercises
`mergeSnapshot()`
against fabricated snapshots: total outage, partial response, silent
regression, a legitimate rating drop, the staleness horizon, repeated
outages, a skipped language pass and a version-mismatched store.

## Motion

One orchestrated moment: the hero name rises behind two masks, a brass
rule draws across, and the copy settles in with the live ratings last.
Everything else is a 360ms, 10px reveal that is meant to go unnoticed,
plus hover states and the count-up on `/stats`.

Motion is deliberately consistent: one gesture, used everywhere. Text
rolls up letter by letter from behind a clipping edge (`AnimatedText`);
blocks and list rows rise the same direction as a unit, cascading one
after another as their section scrolls into view (`Stagger` /
`StaggerItem`). Only `transform` and `opacity` are animated — no filters,
no width or height — so every frame stays on the compositor. Per-word motion is reserved for headings
and leads — running paragraphs animate as a single block, because
word-by-word body copy is both harder to read and needlessly expensive.

**If JavaScript never runs, the page still appears.** Animated elements
are server-rendered hidden, so a client bundle that fails to execute —
a browser extension that mangles a chunk, an ad blocker, a proxy, a
dropped connection — would otherwise leave the whole site blank. A CSS
animation on `[data-entrance]` reveals everything after four seconds;
`components/hydration-flag.tsx` sets `data-hydrated` on the root once
React hydrates, which disarms it. CSS animations were chosen because
animated values outrank inline styles in the cascade, which is what it
takes to override the hidden styles Framer Motion writes. Verify it by
disabling JavaScript in devtools and reloading.

**Reduced motion is handled in CSS, not JavaScript, and this matters.**
The server renders every animated element in its *hidden* state — it
cannot know the visitor's preference — so a client-side
`useReducedMotion()` check that skips the animation also leaves those
inline styles in place forever, and the hero never appears. Every
animated element therefore carries `data-entrance`, and a rule in the
`prefers-reduced-motion` block clears the transform, opacity and stroke
offsets before hydration. The JS check remains, but only to collapse the
timings; the CSS is the guarantee.

## Local development

```bash
npm run dev           # Turbopack (fast)
npm run dev:webpack   # slower first compile, immune to the issue below
```

**If interactive things are dead in dev but fine in `npm run build && npm start`,
it is the editor, not the code.** The Console Ninja VS Code extension
instruments Turbopack chunks and, in its preview-quality Turbopack
support, truncates them — `next/dist/client` and `react-dom` arrive cut
off mid-expression, throw `SyntaxError`, and React never hydrates. The
symptoms are specific and easy to misread as separate bugs: the theme
toggle does nothing, the mobile menu does nothing, chart tabs do
nothing, and all text appears at once with no animation (that last one
is the four-second CSS failsafe below doing its job).

To confirm it in ten seconds, fetch a vendor chunk and check it parses:

```bash
curl -s http://localhost:3000/_next/static/chunks/node_modules_next_dist_client_0_*.js -o /tmp/c.js
node --check /tmp/c.js          # SyntaxError => truncated
grep -c oo_tx /tmp/c.js         # >0 => Console Ninja instrumented it
```

Two fixes, either works: pause the extension (Command Palette → *Console
Ninja: Pause*), delete `.next` since the truncated chunk is cached on
disk, and restart; or just run `npm run dev:webpack`, which is verified
to hydrate correctly even with the extension active.

## Theme default

Dark is the explicit default for a first-time visitor, set by the
blocking script in `<head>` regardless of the OS setting. A stored choice
always wins. Change the two `"dark"` literals in
`components/theme-script.tsx` (and the matching initial state in
`components/theme-toggle.tsx`) to flip it.

## Hero

Three pieces sit on top of each other:

- **`hero-backdrop.tsx`** — atmosphere. Depth comes from parallax, not
  perspective: four layers translate at different fractions of the
  pointer (roughly 14 / 38 / 72 px of travel), so near layers outrun far
  ones and the eye reads separation. A soft light tracks the cursor on a
  faster spring, and a fine inlined SVG grain keeps the gradients from
  reading as flat CSS blobs. Every colour is mixed from the theme
  tokens, so it re-themes for free. Transform-only, and it does not run
  at all on coarse pointers or under `prefers-reduced-motion`.
- **The portrait** — `public/profile_pic.jpeg`, circular, with a hairline
  ring and an accent halo. It is the LCP element, so it carries
  `priority`. To swap it, replace the file and keep the square aspect;
  anything non-square will crop from the centre.
- **The type** — name rolling in letter by letter, then the rule, copy
  and live figures in sequence.

## Skills

Two full-bleed marquee rows drift in opposite directions at different
speeds, slowing to a crawl on hover. The loop is pure CSS: each row
renders its cards twice and translates exactly `-50%`, so the wrap lands
on an identical frame with no JavaScript ticking per frame. Under
`prefers-reduced-motion` the animation is dropped and the rows become
ordinary horizontal scrollers.

`content/skills.ts` carries a [simple-icons](https://simpleicons.org)
slug per entry. Icons are resolved **on the server**, so only the handful
of path strings actually used are inlined into the HTML and the package
never reaches the client bundle. Marks are drawn in `currentColor`, not
brand colours: thirty saturated logos would fight the palette and each
other, and one ink means they invert with the theme for free. An entry
with `icon: null` has no brand mark (SQL, AWS, a concept) and falls back
to a typographic monogram rather than a borrowed glyph.

## Responsive rules worth keeping

Horizontal overflow on a page like this comes from a small number of
repeat offenders, all of which bit at least once here:

1. **Never use `100vw` for full-bleed.** It ignores the scrollbar. The
   skills marquee spans its section instead, through the `bleed` slot on
   `<Section>`.
2. **`overflow-x` containment belongs on `html`, not `body`** — it does
   not reliably propagate from body, and pairing `clip` with a `visible`
   cross-axis makes that axis compute to `auto`. Use `clip`, never
   `hidden`, or the sticky section rails stop working.
3. **Long unbreakable strings set at display size** will widen the whole
   layout viewport: an email address in the contact section and a single
   long word in an animated heading both did. `AnimatedText` word
   wrappers carry `max-w-full` so a word can wrap between its own
   glyphs.
4. **A fixed header must fit the narrowest target.** It cannot shrink to
   the page, so if its contents overflow, the viewport widens instead.
5. **Multi-column grids need to account for the section rail.** At `md`
   the rail already takes 176px, so a four-column figure grid inside it
   gets ~52px per column — the platform ledger waits for `lg`.

Check with `document.documentElement.scrollWidth` against
`clientWidth` at 320, 375, 414, 640, 768, 1024 and 1280.

## Load budget

Measured cold on a simulated mid-range phone (390x844, 4x CPU throttle,
~1.6 Mbps): First Contentful Paint ~1.2-1.3s, load event ~2.1-2.8s,
~576 KB transferred on the homepage.

Two optimisations were tried, measured, and **reverted** because they
were not worth their cost — recorded here so they are not re-attempted
blind:

1. **Fraunces as two static weights instead of the variable file.** Saves
   about 48KB (118KB -> 70KB) but loses the `opsz` axis, so display type
   is no longer optically sized. The type was the reason for choosing
   this face; the bytes lost that argument.
2. **Skill icons as an SVG `<symbol>`/`<use>` sprite.** The marquee
   renders each row twice, so 27 distinct simple-icons paths appear ~86
   times. The sprite cut the homepage HTML from 430KB to 347KB. Route
   transitions measured identical either way (387/339ms with the sprite,
   571/321ms without — the spread is noise), so it was reverted along
   with the fonts.

Together they were worth ~166 KB of transfer. If load size matters more
than the `opsz` axis later, both are small, self-contained changes.

**A caution about measuring this.** An early reading suggested the sprite
took FCP from 4.4s to 1.3s. It did not — that 4.4s was a cold-server
outlier, and later runs put both builds at ~1.2-1.3s. Take a median of
several runs against a warm server before believing any number here.

## The scheduled refresh costs visitors nothing

`/api/revalidate` is a server route. It ships no client JavaScript —
verified by grepping the built chunks for its unique strings — and does
not change what a browser downloads. Pages stay statically prerendered
HTML on the CDN; the refresh only decides *when* that HTML is rebuilt, on
the server, out of band.

This is also the answer to "won't a database call slow every visit?" It
would, if the page read the store per request. It doesn't. The store is
read during background regeneration, so the number of store reads per
day is roughly the number of refreshes, not the number of visitors.

### Request budget

GitHub is the only platform where the budget needs thought, because
unauthenticated REST is 60 requests an hour.

| Pass                        | Requests | Frequency  |
| --------------------------- | -------- | ---------- |
| Profile + search totals     | 4        | every 30m  |
| Contribution calendars      | ~4       | every 30m  |
| Repo listing                | 1        | every 30m  |
| Language byte counts        | ~29      | every 6h   |

The calendars are `github.com` HTML rather than the API, so they don't
count against it. That leaves ~10 API calls an hour, plus ~29 every six
hours — comfortably inside 60. The language fan-out is the whole reason
for the separate `LANGUAGE_REFRESH_SECONDS` clock: running it every
refresh would be ~68 calls an hour and would exhaust the limit.

Setting `GITHUB_TOKEN` raises the limit to 5,000/hour and lets the
language pass run on every refresh. Nothing breaks without it — the
shares just update every six hours instead. If the repo listing is ever
rate limited, `stars` and `forks` come back `null` rather than `0`, so a
throttled run can never render a false zero.

## Performance notes

- Both routes are statically prerendered; no visitor triggers or waits on
  a platform fetch.
- The rating chart is hand-drawn SVG rather than a charting library — one
  path, one baseline, two labels. No library was worth ~40KB for that, and
  a default chart look is exactly what the design avoids. It is still
  code-split with `next/dynamic`, and still server-rendered, so the line
  is in the HTML for crawlers and before hydration.
- The count-up on `/stats` writes through a ref rather than React state,
  and sits inside a container whose width is reserved by an invisible copy
  of the final string, so counting causes no reflow.
- There are no images on the site, so there is no LCP image to prioritise.
  If you add one, use `next/image` and mark only that one `priority`.
