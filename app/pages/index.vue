<template>
  <div class="flex min-h-screen flex-col bg-bg font-ui text-text">
    <a
      href="#main"
      class="skip-link"
      >Skip to content</a
    >

    <main
      id="main"
      class="mx-auto w-full max-w-[1120px] flex-1 px-5 md:px-8"
    >
      <!-- Hero: the umbrella lockup leads (the shell is the ONLY surface that
           renders the full BrandLogo; games keep their text wordmarks). -->
      <section class="flex flex-col items-center pb-10 pt-16 text-center md:pb-14 md:pt-24">
        <BrandLogo :mark-size="76" />
        <p class="mt-8 max-w-xl font-ui text-sub text-text-secondary">
          The competitive fighting-game replay archive. Browse, filter, and study replays across
          every game in the collection.
        </p>
        <p
          class="mt-6 inline-flex items-center gap-2 border border-border-subtle bg-surface-sunken px-4 py-2 font-mono text-[12px] uppercase tracking-label text-text-muted cut-sm"
        >
          <span
            class="inline-block h-1.5 w-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
          {{ aggregate }}
        </p>
      </section>

      <!-- One card per game. Each is a full-page navigation (<a>, not NuxtLink)
           so the click hits the edge rewrite (vercel.json), never the SPA
           router — /2xko and /tekken are not routes in this app. -->
      <section
        aria-label="Games"
        class="grid grid-cols-1 gap-6 pb-16 sm:grid-cols-2 md:gap-7 md:pb-24 lg:grid-cols-3"
      >
        <a
          v-for="g in games"
          :key="g.id"
          :href="g.url"
          class="game-card group flex flex-col overflow-hidden border bg-surface shadow-card cut-lg"
          :style="{ '--accent': g.accent }"
          @mouseenter="playArt"
          @mouseleave="stopArt"
          @focusin="playArt"
          @focusout="stopArt"
        >
          <span
            class="accent-bar h-1 w-full flex-none"
            aria-hidden="true"
          />

          <span class="relative block aspect-[1200/630] overflow-hidden bg-surface-sunken">
            <img
              :src="g.art"
              :alt="`${g.name} Replay Database`"
              width="1200"
              height="630"
              loading="eager"
              class="art h-full w-full object-cover"
            />
            <video
              v-if="g.video"
              :src="g.video"
              :poster="g.art"
              muted
              loop
              playsinline
              preload="none"
              aria-hidden="true"
              tabindex="-1"
              class="art-video absolute inset-0 h-full w-full object-cover"
            />
          </span>

          <span class="flex flex-1 items-end justify-between gap-4 p-5 md:p-6">
            <span class="flex min-w-0 flex-col">
              <span class="font-display text-title font-bold text-text">{{ g.name }}</span>
              <span class="mt-1 truncate font-mono text-[11px] text-text-muted">{{
                g.tagline
              }}</span>
              <span
                v-if="countFor(g.id) !== null"
                class="mt-3 font-ui text-[13px] font-semibold text-text-secondary"
              >
                {{ fmt(countFor(g.id)!) }} replays
              </span>
            </span>

            <span
              class="cta flex flex-none items-center gap-1.5 font-ui text-[13px] font-bold"
              :style="{ color: g.accent }"
            >
              Browse
              <span
                class="transition-transform duration-normal group-hover:translate-x-1"
                aria-hidden="true"
                >→</span
              >
            </span>
          </span>
        </a>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
/**
 * The selector — the apex flagship (replaydatabase.com). Its OWN chrome
 * (layout: false): the umbrella BrandLogo lockup leads, then a card per game.
 * The engine's game nav (Browse/Stats/…) must never surface here (PLAN §5 A.3),
 * and this page links ONLY to the game subpaths (/2xko, /tekken) — never into
 * the engine's Browse/Characters/Players, which would render hollow (A.5).
 *
 * The shell wears the engine's neutral umbrella theme; the ONLY per-game color
 * is each card's own key art + accent (set via the --accent custom property).
 */
definePageMeta({ layout: false });

const games = useAppConfig().games;
const site = useSiteOrigin();

/**
 * Build-time replay counts (PLAN §5 A.4). Each game's summary.json is emitted
 * in Phase 6; until it exists this fetch 404s and the count is OMITTED (never
 * faked, and never fetched from the 1 MB replays.json). Runs server-side at
 * prerender, so the number is baked into the static HTML. Shape-liberal so a
 * Phase-6 summary with the count under `replays` / `count` / `totals.replays`
 * all work; anything else omits safely.
 */
const pickCount = (summary: Record<string, unknown>): number | null => {
  const totals = summary.totals as Record<string, unknown> | undefined;
  const candidates = [summary.replays, summary.count, totals?.replays];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  return null;
};

const { data: counts } = await useAsyncData('selector-game-counts', async () => {
  const entries = await Promise.all(
    games.map(async (g) => {
      try {
        const summary = await $fetch<Record<string, unknown>>(g.summaryUrl, {
          timeout: 5000,
          responseType: 'json',
        });
        return [g.id, pickCount(summary)] as const;
      } catch {
        return [g.id, null] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<string, number | null>;
});

const countFor = (id: string): number | null => counts.value?.[id] ?? null;
const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Hover-to-video: each card layers a muted looping <video> (preload="none",
 * poster = the same key art) over the static art. Playback must be started
 * from JS; the handlers live on the card <a> and find its own video. The
 * poster keeps the identical image on screen until frames arrive, so no
 * playing-state tracking is needed and a failed load degrades to the art.
 * JS-initiated playback isn't covered by the engine's global reduced-motion
 * CSS reset, hence the explicit matchMedia guard.
 */
const playArt = (e: Event) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  (e.currentTarget as HTMLElement)
    .querySelector('video')
    ?.play()
    .catch(() => {});
};
const stopArt = (e: Event) => {
  const v = (e.currentTarget as HTMLElement).querySelector('video');
  if (v) {
    v.pause();
    v.currentTime = 0;
  }
};

const totalReplays = computed(() => games.reduce((sum, g) => sum + (countFor(g.id) ?? 0), 0));
const aggregate = computed(() =>
  totalReplays.value > 0
    ? `${fmt(totalReplays.value)} replays across ${games.length} games`
    : `${games.length} games in the archive`,
);

useSiteMeta({
  title: 'Replay Database — Competitive Fighting-Game Replays',
  description:
    'The competitive fighting-game replay archive. Browse and filter replays for 2XKO, Tekken 8 and Street Fighter 6 — character usage, matchups, pairings, and meta over time, all in one place.',
});

// ItemList JSON-LD enumerating the games (PLAN §5 A.6) — the apex's structured
// data. Absolute apex URLs so crawlers resolve each game under this host.
useJsonLd([
  {
    '@type': 'ItemList',
    name: 'Replay Database — games',
    itemListElement: games.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${g.name} Replay Database`,
      url: `${site}${g.url}`,
    })),
  },
]);
</script>

<style scoped>
/* Structural hover only (color comes from the inline --accent per card). The
   engine's global prefers-reduced-motion reset neutralizes the transition. */
.game-card {
  border-color: var(--color-border-subtle);
  transition:
    transform 0.18s var(--ease-snap),
    border-color 0.18s var(--ease-snap),
    box-shadow 0.18s var(--ease-snap);
}
.game-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
  box-shadow:
    0 0 0 1px var(--accent),
    var(--shadow-lg);
}
.accent-bar {
  background: var(--accent);
}
.art {
  transition: transform 0.4s var(--ease-snap);
}
.game-card:hover .art {
  transform: scale(1.03);
}
.art-video {
  opacity: 0;
  transition: opacity 0.3s var(--ease-snap);
}
.game-card:hover .art-video,
.game-card:focus-within .art-video {
  opacity: 1;
}
</style>
