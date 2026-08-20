<template>
  <footer
    class="sticky bottom-0 z-40 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-6 border-t border-border-subtle bg-surface-sunken px-4 py-4 font-ui text-[11px] text-text-muted sm:px-7"
  >
    <div class="col-start-1 flex min-w-0 items-center gap-4">
      <NuxtLink
        to="/changelog"
        class="-my-2.5 flex-none py-2.5 font-semibold transition-colors duration-normal hover:text-text-secondary"
      >
        Changelog
      </NuxtLink>
      <p class="hidden min-w-0 truncate lg:block">
        {{ brand }} was built with passion and love for the game.
      </p>
    </div>

    <a
      :href="BMC_URL"
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label="Support the site (opens in a new tab)"
      class="col-start-2 -mx-2 -my-2.5 flex flex-none items-center gap-1.5 justify-self-center px-2 py-2.5 font-semibold transition-colors duration-normal hover:text-text-secondary"
    >
      <svg
        class="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M10 2v2" />
        <path d="M14 2v2" />
        <path
          d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"
        />
        <path d="M6 2v2" />
      </svg>
      Help support the site
    </a>

    <p class="col-start-3 hidden justify-self-end font-mono text-[10px] sm:block">
      © {{ year }} {{ brand }}
    </p>
  </footer>
</template>

<script setup lang="ts">
/**
 * The shell's site footer — OVERRIDES the engine's at the same path (Nuxt layer
 * precedence), the same mechanism app/layouts/default.vue uses.
 *
 * WHY AN OVERRIDE AND NOT AN ENGINE CHANGE. The engine's SiteFooter takes no
 * props and exposes no slot, and /changelog is an apex-only route — the games
 * have no such page, so a link in the shared component would be a dead end on
 * four sites. Shadowing it here keeps the change shell-shaped and needs no
 * engine tag or pin bump anywhere.
 *
 * WHAT CHANGED, and nothing else did: column 1 became a flex row carrying the
 * Changelog link ahead of the existing tagline. The three-column grid, the
 * centered Buy Me a Coffee link and the right-hand copyright are byte-identical
 * to the engine's, deliberately — this file is a copy that will drift, so the
 * diff against the engine component should stay this small and this obvious.
 *
 * The link is ALWAYS visible while the tagline stays lg-only: column 1 was
 * empty below lg, so the link costs no width it wasn't already giving away, and
 * the footer is the only navigation the shell has. It is a NuxtLink because
 * /changelog is a real route in this app — unlike the game links on the
 * selector, which are plain <a> so they hit the edge rewrite.
 *
 * If the engine's footer changes, reconcile by hand — nothing detects the drift.
 */
const brand = useBrandName();
const year = new Date().getFullYear();

/** Buy Me a Coffee page linked from the site footer. */
const BMC_URL = 'https://buymeacoffee.com/whatdaflip';
</script>
