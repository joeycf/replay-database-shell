import { fileURLToPath } from 'node:url';

// The @engine alias for the type-only GameConfig import in app.config.ts (the
// generated NODE tsconfig doesn't inherit the layer's alias). Resolved from
// ENGINE_PATH (local co-dev) or the sibling checkout — a local-only concern
// (typecheck), erased at build. Mirrors the game repos.
const engineDir = fileURLToPath(
  new URL(process.env.ENGINE_PATH || '../replay-engine', new URL('.', import.meta.url)),
);

export default defineNuxtConfig({
  // The replay-engine layer: local checkout during co-development (ENGINE_PATH
  // in .env), the pinned tag everywhere else (Vercel leaves ENGINE_PATH unset).
  // Never track a branch — bump the pin deliberately. `install: true` is
  // REQUIRED for git layers: without it the cloned layer gets no node_modules
  // and its runtime deps (@tailwindcss/vite, ufo, …) don't resolve (STACK §5.5).
  // v0.5.2 is the platform-wide engine tag (both games pin it too); it carries
  // the shared sticky footer (Buy Me a Coffee centered + copyright).
  extends: [process.env.ENGINE_PATH || ['github:joeycf/replay-engine#v0.5.2', { install: true }]],

  compatibilityDate: '2025-07-01',

  // The shell OWNS the apex domain and serves the selector at the root. It
  // never runs under a subpath, so baseURL stays '/'. Ship NO theme.css: the
  // engine's neutral default IS the ReplayDB umbrella brand (teal/gold, Space
  // Grotesk), which is exactly what the selector should wear so it favors no
  // single game (PLAN §5 / Phase-5 prompt A.1). Per-game color comes only from
  // each card's own key art + accent.
  app: {
    baseURL: '/',
  },

  nitro: {
    prerender: {
      // CRITICAL build-safety guard. The engine defaults crawlLinks:true; the
      // shell overrides it to FALSE. The selector links to /2xko and /tekken,
      // which are edge REWRITES (vercel.json), NOT Nuxt routes. Vercel's
      // vercel.json rewrites are FALLBACKS — applied only when no static file
      // matches — so if the prerenderer crawled those links it would emit
      // /2xko/* (hollow catch-all) HTML that would SHADOW the rewrites and
      // break the games. With crawlLinks:false only the three engine-seeded
      // routes generate: '/', '/health', '/not-found'. Nothing under a game
      // prefix is ever written. (The game links are plain <a> for full-page
      // navigation so runtime clicks hit the edge rewrite, not the SPA router.)
      crawlLinks: false,
    },
  },

  modules: [
    // Turn the engine's static-artifacts sitemap.xml (a page sitemap) into a
    // sitemap INDEX referencing the shell's own page sitemap plus each game's
    // /<slug>/sitemap.xml. App-side adaptation per PLAN §5 prompt B.3 — zero
    // engine change. Runs after the engine module on prerender:done and
    // overwrites sitemap.xml.
    fileURLToPath(new URL('./modules/sitemap-index.ts', import.meta.url)),
  ],

  typescript: {
    // Typecheck runs explicitly via `npm run typecheck` (vue-tsc).
    typeCheck: false,
    // app/app.config.ts lands in the generated NODE tsconfig, which doesn't
    // inherit the engine layer's @engine alias — mirror it for the type-only
    // GameConfig import (erased at build; typecheck assumes the sibling engine
    // checkout per the STACK dev loop).
    nodeTsConfig: {
      compilerOptions: {
        paths: {
          '@engine': [engineDir],
          '@engine/*': [`${engineDir}/*`],
        },
      },
    },
  },
});
