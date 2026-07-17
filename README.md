# replay-database-shell

The **Replay Database selector shell** — the apex ([replaydatabase.com](https://replaydatabase.com))
landing page of the multi-game platform, and the owner of its routing. A thin consumer of
the [`replay-engine`](https://github.com/joeycf/replay-engine) Nuxt layer (pinned tag, see
`nuxt.config.ts`).

What this repo is:

- **The selector** (`app/pages/index.vue`) — the umbrella-branded landing page: the full
  ReplayDB `BrandLogo` lockup (the shell is the only surface that renders it), one card
  per game linking to its subpath, replay counts when the games publish `summary.json`
  (Phase 6; omitted until then, never faked), and `ItemList` JSON-LD.
- **The router** (`vercel.json`) — external rewrites proxy `/2xko/*` and `/tekken/*` to
  each game's own Vercel deployment, plus the **permanent** 301 map that migrated 2XKO's
  legacy root URLs (`/champions/*`, `/players/*`, `/stats`, and the query-string deep
  links on `/`) to `/2xko/*`. Those redirects are permanent infrastructure; they never
  come out. **Never add host-based redirects on the game projects** — the rewrites proxy
  to those hosts, so a host redirect there loops.
- **The platform sitemap** (`modules/sitemap-index.ts`) — rewrites the engine-emitted
  page sitemap into `/sitemap.xml` as a **sitemap index** referencing the shell's own
  `sitemap-pages.xml` plus both games' `/<slug>/sitemap.xml`. The engine's robots.txt
  already points at `/sitemap.xml`, so the Search Console submission carries over.

What this repo deliberately is NOT:

- **No theme.css** — the engine's neutral default IS the ReplayDB umbrella brand
  (teal/gold, Space Grotesk). The selector wears it unmodified so it favors no game;
  per-game color comes only from each card's key art + accent (`lib/games.ts`).
- **No game data** — `public/data/*.json` are empty stubs so the engine's `/health`
  fetch-fallback resolves cleanly. The engine's Browse/Characters/Players pages exist as
  routes but are never linked or prerendered here (`crawlLinks: false` in
  `nuxt.config.ts` — see the comment there for why that flag is load-bearing: crawled
  `/2xko`/`/tekken` output would shadow the edge rewrites).

## Commands

| Command                                  | What it does                                                         |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `npm run dev`                            | Dev server (set `ENGINE_PATH=../replay-engine` in `.env` for co-dev) |
| `npm run generate`                       | Static build → `.vercel/output/static`                               |
| `npm run typecheck`                      | `nuxt prepare` + `vue-tsc`                                           |
| `npm run lint`                           | ESLint (flat config, Prettier last)                                  |
| `node scripts/verify-shell.mjs`          | Headless gates on the BUILT output (selector/health/404)             |
| `node scripts/verify-cutover.mjs <host>` | Post-cutover battery against a live host                             |

Stack contract: replicated from the engine's `STACK.md` §1 (devDependencies, `overrides`,
`engines.node >=24 <25`, `.npmrc` legacy-peer-deps, lint/format/tsconfig files).
