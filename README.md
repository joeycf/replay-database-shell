# Replay Database Shell

The **selector shell** for the Replay Database platform — the landing page at
[replaydatabase.com](https://replaydatabase.com), and the owner of the domain's
routing, robots, and sitemap index.

The app is a **thin layer over [replay-engine](https://github.com/joeycf/replay-engine)**
(pinned by tag in `nuxt.config.ts`): the engine owns the shared UI, chrome, and
design tokens, and this repo supplies the selector page, the game registry, and
the edge routing that puts both games on one domain. Unlike the game apps it
ships **no data pipeline and no theme** — it wears the engine's neutral umbrella
brand unmodified, so it favors no single game.

> Part of the **Replay Database** platform — [replaydatabase.com](https://replaydatabase.com) ·
> [engine](https://github.com/joeycf/replay-engine) ·
> [2XKO](https://github.com/joeycf/2xko-replay-database) ·
> [Tekken](https://github.com/joeycf/tekken-replay-database)

## Architecture

The shell is four things: a selector, a changelog, a router, and a sitemap.
(The diagram below traces the three with a routing role; the changelog is a
static leaf.)

```
                    replaydatabase.com  (this repo, baseURL '/')
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
  selector page          vercel.json             sitemap.xml
  app/pages/index.vue    ├─ redirects (308)      modules/sitemap-index.ts
      │                  │    legacy 2XKO root         │
      │                  │    URLs → /2xko/*           ├─► sitemap-pages.xml
   lib/games.ts ─────────┤                             ├─► /2xko/sitemap.xml
   (single source:       └─ rewrites (proxy)           └─► /tekken/sitemap.xml
    cards, JSON-LD,           /2xko/*   ──► 2xko-replay-database.vercel.app
    sitemap index)            /tekken/* ──► tekken-replay-database.vercel.app
```

- **The selector** (`app/pages/index.vue`) — the umbrella-branded landing page:
  the full ReplayDB `BrandLogo` lockup (the shell is the only surface that
  renders it), one card per game linking to its subpath, and `ItemList` JSON-LD.
  Replay counts appear only once the games publish `summary.json` — omitted until
  then, never faked.
- **The changelog** (`app/pages/changelog.vue`) — the platform's public history,
  read from the hand-curated `lib/changelog.ts` and prerendered like any other
  route. Each entry's scope badge borrows that game's accent from `lib/games.ts`,
  matched on `slug`. It is the one page here with editorial content, and the one
  route that must be named in `nitro.prerender.routes` — see the standing rule on
  `crawlLinks`.
- **The router** (`vercel.json`) — external rewrites proxy `/2xko/*` and
  `/tekken/*` to each game's own Vercel deployment, plus the **permanent**
  redirect map that migrated 2XKO's legacy root URLs (`/champions/*`,
  `/players/*`, `/stats`, and the query-string deep links on `/`) to `/2xko/*`.
  `"permanent": true` emits **308**, which preserves the request method.
  `trailingSlash: false` keeps the apex canonical form stable.
- **The platform sitemap** (`modules/sitemap-index.ts`) — runs after the engine's
  `static-artifacts` module on `prerender:done`, renames the engine-emitted page
  sitemap to `sitemap-pages.xml`, and overwrites `/sitemap.xml` with a sitemap
  **index** referencing it plus both games' `/<slug>/sitemap.xml`. The engine's
  `robots.txt` already advertises `<siteUrl>/sitemap.xml`, so 2XKO's existing
  Search Console submission carries over in place.

`lib/games.ts` is the single source for all three: the cards, the JSON-LD, and
the sitemap index all read the same array, so the page and the sitemap cannot
drift. It's dependency-free (no Nuxt/Vue imports) precisely so the build-time
module can import it too.

### What this repo deliberately is NOT

- **No `theme.css`.** The engine's neutral default _is_ the ReplayDB umbrella
  brand (teal/gold, Space Grotesk), which is exactly what a game-agnostic
  selector should wear. Per-game color enters only through each card's own key
  art and accent (`lib/games.ts`), never the page chrome.
- **No game data.** `public/data/*.json` are empty stubs so the engine's
  `/health` fetch-fallback resolves cleanly. The engine's Browse/Characters/
  Players pages exist as routes but are never linked or prerendered here.

## Setup

```sh
npm install
npm run dev
```

There is no `.env` to populate — the shell has no pipeline and no secrets. One
env var matters locally, and it isn't secret:

- `ENGINE_PATH` — point at a local `replay-engine` checkout (e.g. `../replay-engine`)
  to co-develop shell and engine. Unset, the pinned git tag is used; **Vercel
  leaves it unset**.

The shell owns the apex and never runs under a subpath, so `baseURL` stays `/`
and there is no `NUXT_APP_BASE_URL` dance here — that's a game-app concern.

## Scripts

| script                                           | what it does                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `generate` / `preview` | Nuxt app (generate = full static build)                                           |
| `npm run typecheck`                              | `nuxt prepare` + `nuxt typecheck` (vue-tsc)                                       |
| `npm run lint` / `lint:fix`                      | ESLint over the whole repo                                                        |
| `npm run format` / `format:check`                | Prettier                                                                          |
| `npm run verify:changelog`                       | Schema gate on `lib/changelog.ts` — dates, scopes, kinds, ordering                |
| `npm run verify:shell`                           | Headless gates on the **built** output — selector, theme, JSON-LD, `/health`, 404 |
| `npm run verify:cutover <host>`                  | The post-cutover battery against a **live** host (defaults to replaydatabase.com) |
| `node scripts/simulate-topology.mjs`             | Serve the built shell behind a faithful local implementation of `vercel.json`     |
| `node scripts/card-art-tokon.mjs`                | One-off: regenerate the Tōkon coming-soon card art. Not wired into the build      |

## Verification

Routing is the thing most easily broken and least visible in review, so it has
three levels of check:

- **`npm run verify:shell`** runs against `.vercel/output/static` — never the dev
  server, which masks base and theme behavior. It asserts the selector renders
  with the umbrella theme (computed `--color-primary` = ReplayDB teal), one card
  per game with its own accent, plain `<a>` hrefs at `/2xko` and `/tekken`, no
  game nav, valid `ItemList` JSON-LD, a designed 404, and that no page request
  escapes the static root.
- **`node scripts/simulate-topology.mjs`** reproduces production topology
  locally: redirects evaluated before the filesystem, then the shell's static
  output, then rewrites proxied to the two games' local builds, then the designed 404. This is how a routing change gets tested without deploying.
- **`npm run verify:changelog`** validates `lib/changelog.ts` before anything
  renders it: ISO dates, known scopes and kinds, reverse-chronological order, no
  future dates, title and sentence limits. It runs as the last step of
  `npm run typecheck`, because a malformed entry cannot fail a static build — it
  just ships.
- **`npm run verify:cutover`** runs against a live host: every legacy 2XKO URL
  shape redirecting through to a 200, both games clicking through the proxy with
  their own themes intact and canonicals on the apex origin, and `/sitemap.xml`
  parsing as a sitemap index.

[`docs/CUTOVER.md`](./docs/CUTOVER.md) is the runbook the migration followed and
records the standing rules below.

## Vercel

Its own Vercel project, and the one that holds the apex domain. `vercel.json`
commits the build command, framework preset, routing, and `trailingSlash`; the
rest is dashboard config:

| setting               | value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Framework preset      | **Nuxt** (`vercel.json` → `"framework": "nuxtjs"`)                                       |
| Build command         | `npm run generate` (committed in `vercel.json`)                                          |
| Output directory      | _(auto — Build Output API, `.vercel/output`)_                                            |
| Node.js version       | 24 (`engines.node: ">=24 <25"`)                                                          |
| Domains               | `replaydatabase.com` — the apex the rewrites and sitemap index are written against       |
| Environment variables | `NUXT_PUBLIC_SITE_URL` overrides `lib/site.ts`'s `SITE_URL` at build if set. No secrets. |

## Analytics

Inherited from the engine — Vercel **Web Analytics** and **Speed Insights**,
client-only and inert outside production. The shell's own base is `/`, so it
needs no endpoint config; it does, however, **carry the routing for everyone
else**.

Both SDKs resolve their script and beacons against a **same-origin** prefix, so
the project credited is whichever one owns that path on the domain being
browsed. Every page under `/2xko`, `/tekken`, `/sf6` and `/tokon` is served on the apex —
so without help, all of their data would land here.

`vercel.json` therefore carries one insights rewrite per game:

```
/<slug>-insights/:path*  →  https://<slug>-replay-database.vercel.app/_vercel/insights/:path*
```

Each is paired 1:1 with `observability.insights: '/<slug>-insights'` in that
game's `app.config.ts`. **The pair ships together or every beacon 404s** — and
404s silently, which is exactly how the Phase-5 cutover lost ~10 days of
analytics for all four games. `npm run verify:cutover` gates it.

Same-origin is not incidental: the child projects' `/_vercel/insights/*`
endpoints send no `Access-Control-Allow-*` headers, so pointing a game straight
at its own absolute URL would die at preflight. Proxying keeps the beacon
first-party.

**Speed Insights is deliberately NOT per-game.** It is single-project on the
Hobby plan, so every game's vitals go to the stable `/_vercel/speed-insights/*`
on the apex — i.e. to this project. Do not add per-game vitals rewrites without
checking that limit first.

## Adding a game to the selector

1. Add the entry to `GAMES` in `lib/games.ts`: `id`, `name`, `shortName`, `slug`,
   `url`, `accent` (match the game's `theme.css` `--color-primary`), `art`,
   `video`, `tagline`, `sitemapUrl`, `summaryUrl`. The card, the `ItemList`
   JSON-LD, and the sitemap index all pick it up from here.
2. Drop the key art at `public/img/games/<slug>.png` and the muted hover loop at
   `public/video/games/<slug>.mp4`.
3. Add the rewrite pair to `vercel.json` — both `/<slug>` and `/<slug>/:path*`,
   pointing at the game's own deployment. Add the insights rewrite in the same
   commit: `/<slug>-insights/:path*` →
   `https://<slug>-replay-database.vercel.app/_vercel/insights/:path*`, matching
   the game's `observability.insights`. Skip it and that game's analytics is
   dead on arrival, with nothing in any dashboard to tell you.
4. Confirm the game app commits `app.baseURL` defaulting to `/<slug>/`, or the
   proxied build will resolve its assets against the wrong base.
5. `npm run generate && npm run verify:shell`, then
   `node scripts/simulate-topology.mjs` to exercise the routing before deploying.
6. Add `<slug>-replay-database` to `GAMES` in `../fetch-and-pull.sh` and to
   `APPS` in `../commit-and-push.sh`. Miss this and the clone falls behind its
   own daily `data: refresh` commits and never gets pushed —
   `commit-and-push.sh`'s `drift_check` warns about it, but only once you run
   the script. If the app's `npm run typecheck` ends in a repo-local data
   validator (`scripts/patches.ts --check` and friends), give it a `GATE_CMD`
   entry there too, so a failed validator isn't read as a bad engine pin.
7. **Add the changelog entry in the same commit** — a new game is always worth
   one. See "Maintaining the changelog" below for what an entry says.

## Adding an upcoming game (a "Coming Soon" card)

A game that has been announced but has no replays yet goes in **`UPCOMING`**, not
`GAMES`:

1. Add the entry to `UPCOMING` in `lib/games.ts`: `id`, `name`, `shortName`,
   `slug`, `accent`, `art`, `tagline`. That type has **no** `url`, `sitemapUrl`
   or `summaryUrl` — the fields don't exist, so the entry cannot reach the
   `ItemList` JSON-LD or the sitemap index even by accident. The card grid is its
   only consumer.
2. Drop 1200×630 key art at `public/img/games/<slug>.png`. No hover video — the
   card is not interactive.
3. **Nothing else.** No `vercel.json` rewrite (there is no deployment to proxy
   to), no insights rewrite, no summary, no video.
4. The tagline describes the game and **never carries a release date**. This repo
   redeploys only when the shell changes, so a date baked into static HTML goes
   stale unattended while "Coming Soon" stays true.
5. `npm run generate && npm run verify:shell` — the gates assert the ItemList
   still has exactly 4 entries, the sitemap index exactly 4 game children, and
   that the card has no `href` and is not inside an `<a>`.

Art for a game with no repo is generated in-repo: `node scripts/card-art-tokon.mjs`
is the one-off that produced `tokon.png` and is the only record of how. Deliberately
not wired into the build — `npm run generate` must not need Chrome.

**Promotion at launch is a move, not a copy:** when the pipeline ships, the entry
leaves `UPCOMING`, joins `GAMES` (appending), gains the three URL fields, and
takes the `vercel.json` rewrite pair per the section above.

## Maintaining the changelog

`/changelog` is the platform's public history, and `lib/changelog.ts` is the
whole of it — a hand-curated table in the same tradition as the games' season and
patch tables. `npm run verify:changelog` keeps it well-formed; **what goes in it
stays a human judgment**, and the file's own header is the long version of the
rules below.

**A user-visible change adds an entry in the same commit.** Launches always. A
feature when a visitor could notice it. Internal work only through its visible
effect, described as that effect — "first loads went from 31 MB to 7 MB", never
the refactor that did it. Silence is a valid outcome: most commits earn nothing,
and a thin month is a thin month.

Two rules worth repeating because breaking them is invisible until it's public:

- **Only numbers that stay true.** One-time deltas, frozen counts and
  measurements are safe forever. Live totals are not — the archives grow daily,
  the selector already shows those counts from each game's `summary.json`, and a
  number baked into this static page is wrong by tomorrow. Where a launch total
  is the point, say so and let the entry's date carry it.
- **Dates come from git, not memory.** Every entry's provenance comment records
  the commit or tag that dated it, so a row nobody can point at a source for is
  visible rather than merely plausible.

## Standing rules (never undo)

- **The redirect map is permanent infrastructure.** Those legacy 2XKO URLs were
  indexed at the domain root; the redirects never come out.
- **Never add host-based redirects on the game projects.** The rewrites proxy to
  `*.vercel.app` hosts, so a vercel.app → apex redirect there is a loop. Those
  aliases stay reachable and harmless; canonicals consolidate to the apex.
- **A coming-soon game never enters `GAMES`.** `UPCOMING`'s type has no
  `url`/`sitemapUrl`/`summaryUrl` on purpose: `GAMES` feeds three surfaces and
  only the cards may show a game with no replays — announcing one in structured
  data or a sitemap is a lie to crawlers, and two of the three consumers fail
  silently. Don't collapse the two arrays behind a `status` flag.
- **`crawlLinks: false` in `nuxt.config.ts` is load-bearing.** Vercel's
  `vercel.json` rewrites are _fallbacks_ — applied only when no static file
  matches. The selector links to `/2xko` and `/tekken`, which are edge rewrites,
  not Nuxt routes; if the prerenderer crawled them it would emit hollow
  `/2xko/*` HTML that **shadows the rewrites and breaks both games**. With the
  flag off, only the three engine-seeded routes generate: `/`, `/health`,
  `/not-found`. The game links are plain `<a>` for the same reason — a full-page
  navigation hits the edge rewrite instead of the SPA router. **The corollary:
  every shell route beyond those three must be listed in
  `nitro.prerender.routes` by hand** (`/changelog` is), because being linked
  from the footer does not get a page crawled — it would build clean, work in
  `nuxt dev`, and ship as a 404.

## Tech stack & engineering notes

### Stack

Shape only; the engine's [`STACK.md`](https://github.com/joeycf/replay-engine/blob/main/STACK.md)
is the single source of pinned versions, and this repo replicates its §1
contract (devDependencies, the `overrides` block, `engines.node`, lint/format/
tsconfig files).

| layer      | choice                                          | notes                                                                                                |
| ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Framework  | **Nuxt 4** (Vue 3, `<script setup>`)            | `ssr: true` for prerender fidelity, output **100% static** — `vercel-static` preset, `nuxt generate` |
| Base layer | **replay-engine**, pinned by tag                | `extends:` a git layer (`install: true` is required, or its runtime deps don't resolve)              |
| Language   | **TypeScript** end to end                       | `nuxt typecheck` (vue-tsc); no pipeline tsconfig here — there's no pipeline                          |
| Styling    | **Tailwind CSS v4**, via the engine layer       | **no `theme.css` by design** — the umbrella brand is the engine's default, worn unmodified           |
| Fonts      | inherited from the engine                       | Space Grotesk / Inter / JetBrains Mono, committed `@fontsource` assets — no runtime CDN              |
| Routing    | **`vercel.json`** redirects + external rewrites | the only place the platform's URL topology is expressed                                              |
| Tests      | **puppeteer-core** (bespoke harness)            | drives system Chrome at `/usr/bin/google-chrome-stable`; no bundled browser                          |
| Host       | **Vercel** Build Output API (`.vercel/output`)  | holds the apex domain; no cron, no pipeline                                                          |
| Node       | **24** (`engines.node: ">=24 <25"`)             | matches the platform policy                                                                          |

### Things worth knowing

- **This repo is almost entirely routing.** `app/` holds five files —
  `app.config.ts`, `pages/index.vue`, `pages/changelog.vue`,
  `layouts/default.vue`, and `components/SiteFooter.vue`. Everything visual
  comes from the engine; the layout and the footer are overrides of engine
  components at the same path, not new designs. The interesting code is
  `vercel.json`, `modules/sitemap-index.ts`, and `lib/games.ts`.
- **The umbrella identity is expressed as empty strings.** `app.config.ts` sets
  `slug: ''` and `shortName: ''`, which is what makes the engine render the bare
  "Replay Database" brand and the umbrella wordmark instead of a per-game
  lockup. It's a deliberate signal value, not an oversight.
- **Verify on the built output, never the dev server.** Base-path and theme
  behavior differ between the two, and the dev server is the more forgiving of
  them — which is exactly why it's the wrong place to certify a routing change.
- **The sitemap index adapts the engine rather than changing it.** Turning a page
  sitemap into an index is a shell-only concern, so it's a shell-side module with
  zero engine modification — the games keep emitting plain page sitemaps.

> Feature requests and bug reports are welcome via Issues.
