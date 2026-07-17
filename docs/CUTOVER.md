# Phase-5 cutover runbook — replaydatabase.com → shell + subpaths

State when this was written: everything below is **staged and locally verified**
(28/28 cutover battery against the simulated topology — `npm run verify:cutover`
vs `scripts/simulate-topology.mjs`). Nothing has been pushed. The Vercel env
vars (C.1) are already set on both game projects (Production + Preview):
`NUXT_APP_BASE_URL=/2xko/` | `/tekken/` and
`NUXT_PUBLIC_SITE_URL=https://replaydatabase.com`.

**FREEZE RULE — from now until step 5 is complete, push NOTHING to either game
repo except as instructed below.** The truth-up commits are on each local
`main`; once pushed, that game's production build serves under its subpath. If
that happens while the apex still points at the 2XKO project, the apex breaks
(root URLs 404). The ordering below keeps the broken window to ~one build.

Local commits waiting (`git log` in each repo):

| Repo                     | Commit           | Contents                                                                                        |
| ------------------------ | ---------------- | ----------------------------------------------------------------------------------------------- |
| `replay-engine`          | `v0.5.1` (+ tag) | static-artifacts subpath fix — REQUIRED for any subpath build                                   |
| `2xko-replay-database`   | truth-up         | `baseURL` env expression w/ `/2xko/` default; `GameConfig.baseURL '/2xko'`; engine pin → v0.5.1 |
| `tekken-replay-database` | truth-up         | same, `/tekken/`; pin v0.5.0 → v0.5.1                                                           |
| `replay-database-shell`  | initial          | selector + vercel.json (rewrites + 301 map) + sitemap index                                     |

## Stage A — rehearsal on Vercel previews (C.3) — ✅ COMPLETE (2026-07-17)

Executed against real preview deployments; **28/28 battery green** on
`replay-database-shell-q6fo0os4i-….vercel.app` proxying
`2xko-replay-database-jatxmqcos-…` + `tekken-replay-database-d0xn7jtb4-…`.
Deployment protection can be re-enabled on all three projects (previews are
only rehearsal artifacts now).

Three real findings, all fixed and folded into the staged commits:

1. **`.vercelignore` (all three repos): a `.vercelignore` REPLACES
   `.gitignore`-based exclusion for CLI uploads.** Without it, the gitignored
   `.env` rode the upload and its `ENGINE_PATH=../replay-engine` made the
   remote build resolve a nonexistent sibling instead of the github tag — the
   app built with no engine layer and every route 500'd. The file must mirror
   `.gitignore` (a partial one un-ignores everything else: 2XKO's `cache/` +
   `raw/` trees then OOM-killed the CLI upload). Git-driven production deploys
   are unaffected (they never see gitignored files).
2. **2XKO's `.vercel/repo.json` (repo-link mode) made the CLI walk 38k files**;
   replaced with a plain `project.json` link like the other repos.
3. **`trailingSlash: false` in the shell `vercel.json` is REQUIRED.** On the
   real edge, `/2xko/:path*` does NOT match the bare trailing-slash form
   `/2xko/` (empty star + trailing slash = no match in Vercel's matcher — the
   local simulator was initially too lenient and masked it). Browse homes and
   every query deep-link destination fell through to the shell's 404.
   `trailingSlash: false` 308-normalizes every slash form onto the matchable
   one; the query-redirect destinations are `/2xko` (slashless) for a
   single-hop chain. The simulator now models both faithfully.

## Stage B — the cutover (D; do at a quiet hour, steps back-to-back)

1. **Shell to production.** Create the GitHub repo, push, connect, deploy:
   ```sh
   cd replay-database-shell
   gh repo create joeycf/replay-database-shell --private --source . --push
   vercel git connect
   vercel deploy --prod        # or push again after connecting — either deploys
   ```
   Verify the selector on `replay-database-shell.vercel.app` (rewrites already
   point at the games' production aliases; `/2xko/*` will 404 until step 3 —
   expected, the games are still root-built).
2. **Move the domain.** Vercel dashboard → project `2xko-replay-database` →
   Settings → Domains → remove `replaydatabase.com` **and `www.replaydatabase.com`**;
   then project `replay-database-shell` → Settings → Domains → add both (same
   account: DNS does not change). From this instant the apex serves the
   selector and every legacy URL 301s into the known-404 window.
3. **Immediately push both truth-ups** (the builds that close the window):
   ```sh
   cd ../2xko-replay-database   && git push
   cd ../tekken-replay-database && git push
   ```
   ~1–2 min each; when both show **Ready**, `/2xko/*` and `/tekken/*` are live.
4. **Post-cutover battery** against the real apex:
   ```sh
   cd ../replay-database-shell && npm run verify:cutover
   ```
   28/28 expected. Spot-check by hand: `/`, `/champions/ekko`,
   `/?fuse=juggernaut`, `/tekken/`.
5. **Search Console**: submit `https://replaydatabase.com/sitemap.xml` (now the
   index) on the existing property. No Change-of-Address — same domain.
   Coverage reshuffles over days–weeks as the 301s process; the 742 legacy
   URLs each have a 1:1 `/2xko/...` twin in the new game sitemap.

## Standing rules (never undo)

- The `vercel.json` 301 map is permanent infrastructure.
- Never add host-based redirects (vercel.app → apex) on the game projects —
  the shell proxies to those hosts; a host redirect there is a loop.
- Canonicals consolidate everything to the apex; the games' vercel.app hosts
  stay reachable and harmless.
