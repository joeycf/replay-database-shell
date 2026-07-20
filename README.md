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

The shell is three things: a page, a router, and a sitemap.

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
| `npm run verify:shell`                           | Headless gates on the **built** output — selector, theme, JSON-LD, `/health`, 404 |
| `npm run verify:cutover <host>`                  | The post-cutover battery against a **live** host (defaults to replaydatabase.com) |
| `node scripts/simulate-topology.mjs`             | Serve the built shell behind a faithful local implementation of `vercel.json`     |

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
client-only and inert outside production. Nothing to configure here.

## Adding a game to the selector

1. Add the entry to `GAMES` in `lib/games.ts`: `id`, `name`, `shortName`, `slug`,
   `url`, `accent` (match the game's `theme.css` `--color-primary`), `art`,
   `video`, `tagline`, `sitemapUrl`, `summaryUrl`. The card, the `ItemList`
   JSON-LD, and the sitemap index all pick it up from here.
2. Drop the key art at `public/img/games/<slug>.png` and the muted hover loop at
   `public/video/games/<slug>.mp4`.
3. Add the rewrite pair to `vercel.json` — both `/<slug>` and `/<slug>/:path*`,
   pointing at the game's own deployment.
4. Confirm the game app commits `app.baseURL` defaulting to `/<slug>/`, or the
   proxied build will resolve its assets against the wrong base.
5. `npm run generate && npm run verify:shell`, then
   `node scripts/simulate-topology.mjs` to exercise the routing before deploying.

## Standing rules (never undo)

- **The redirect map is permanent infrastructure.** Those legacy 2XKO URLs were
  indexed at the domain root; the redirects never come out.
- **Never add host-based redirects on the game projects.** The rewrites proxy to
  `*.vercel.app` hosts, so a vercel.app → apex redirect there is a loop. Those
  aliases stay reachable and harmless; canonicals consolidate to the apex.
- **`crawlLinks: false` in `nuxt.config.ts` is load-bearing.** Vercel's
  `vercel.json` rewrites are _fallbacks_ — applied only when no static file
  matches. The selector links to `/2xko` and `/tekken`, which are edge rewrites,
  not Nuxt routes; if the prerenderer crawled them it would emit hollow
  `/2xko/*` HTML that **shadows the rewrites and breaks both games**. With the
  flag off, only the three engine-seeded routes generate: `/`, `/health`,
  `/not-found`. The game links are plain `<a>` for the same reason — a full-page
  navigation hits the edge rewrite instead of the SPA router.

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

- **This repo is almost entirely routing.** `app/` holds three files —
  `app.config.ts`, `pages/index.vue`, `layouts/default.vue`. Everything visual
  comes from the engine. The interesting code is `vercel.json`,
  `modules/sitemap-index.ts`, and `lib/games.ts`.
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
