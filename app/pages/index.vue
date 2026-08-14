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
        <!-- `.aggregate` / `.count` are the gates' stable hooks
             (scripts/verify-shell.mjs, scripts/verify-cutover.mjs). -->
        <p
          class="aggregate mt-6 inline-flex items-center gap-2 border border-border-subtle bg-surface-sunken px-4 py-2 font-mono text-[12px] uppercase tracking-label text-text-muted cut-sm"
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
        class="grid grid-cols-1 gap-6 pb-16 sm:grid-cols-2 md:gap-7 md:pb-24"
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
              <!-- The count line keeps its box whether or not the number
                   arrives: a summary that 404s (a game that hasn't shipped one)
                   or lands late must not shift the card. -->
              <span class="count mt-3 block font-ui text-[13px] font-semibold text-text-secondary">
                <template v-if="countFor(g.id) !== null"
                  >{{ fmt(countFor(g.id)!) }} replays</template
                >
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

        <!-- Announced, not yet in the archive. Reads `upcoming`, whose type has
             no url/sitemapUrl/summaryUrl, so it cannot reach the ItemList
             JSON-LD or the sitemap index (lib/games.ts explains the split).
             NOT a link and NOT focusable: there is nothing to navigate to, and a
             focus stop that does nothing is a keyboard/screen-reader dead end.
             The affordance is therefore the PERSISTENT badge — always rendered,
             always in the accessibility tree — not a hover reveal, which would
             leave the card looking simply broken on touch. -->
        <article
          v-for="u in upcoming"
          :key="u.id"
          class="upcoming-card flex flex-col overflow-hidden border bg-surface shadow-card cut-lg"
          :style="{ '--accent': u.accent }"
        >
          <span
            class="accent-bar h-1 w-full flex-none"
            aria-hidden="true"
          />

          <span class="relative block aspect-[1200/630] overflow-hidden bg-surface-sunken">
            <img
              :src="u.art"
              alt="MARVEL Tōkon: Fighting Souls — coming soon to Replay Database"
              width="1200"
              height="630"
              loading="eager"
              class="art-upcoming h-full w-full object-cover"
            />
            <!-- Desaturation + veil mark the card unavailable rather than merely
                 different; both lift on hover. The badge never dims. -->
            <span
              class="veil absolute inset-0"
              aria-hidden="true"
            />
            <span
              class="badge absolute left-4 top-4 border bg-surface-sunken/90 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-label cut-sm"
              :style="{ color: u.accent, borderColor: u.accent }"
            >
              Coming Soon
            </span>
          </span>

          <span class="flex flex-1 items-end justify-between gap-4 p-5 md:p-6">
            <span class="flex min-w-0 flex-col">
              <span class="font-display text-title font-bold text-text">{{ u.name }}</span>
              <span class="mt-1 truncate font-mono text-[11px] text-text-muted">{{
                u.tagline
              }}</span>
              <!-- Matches the live cards' reserved count line so this card's
                   height stays theirs. NOT class="count" — that's a gate hook
                   and the gates count non-empty ones. -->
              <span
                class="count-slot mt-3 block"
                aria-hidden="true"
              />
            </span>
            <!-- No CTA counterpart to the live cards' "Browse →": there is
                 nothing to do here, the badge already says so, and the text
                 would eat the title column at the sm 2-up width. -->
          </span>
        </article>
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
/** Announced, not yet in the archive — the card grid is its ONLY consumer. It is
 *  deliberately absent from `resolvedCounts`, the aggregate line and the ItemList
 *  JSON-LD below: none of those may count a game with no replays. */
const upcoming = useAppConfig().upcoming;
const site = useSiteOrigin();

/**
 * Per-game replay counts, read from each game's data/summary.json (PLAN §5 A.4,
 * shipped in Phase 6). Two deliberate properties:
 *
 *  • SAME-ORIGIN — `summaryUrl` is subpath-relative (`/2xko/data/summary.json`),
 *    so the request goes through the shell's own rewrites (vercel.json) and
 *    never leaves the apex origin. Absolute game-host URLs would be
 *    cross-origin here and the browser would block them: the game deployments
 *    send no CORS headers.
 *  • CLIENT-SIDE — the prerenderer serves only this app's own three routes, so
 *    a build-time fetch of a game subpath could never resolve; and a number
 *    baked into static HTML would stale between shell deploys anyway. The
 *    prerendered HTML (and the meta/OG descriptions) therefore carry no counts.
 *
 * Each card lights up as its own fetch lands. A failure — a game that hasn't
 * shipped its summary yet, a network error, a malformed payload — is dropped
 * silently: the count line is already reserved, so nothing moves. Numbers are
 * never faked and never derived from the 1 MB replays.json.
 */
const counts = ref<Record<string, number>>({});

const replayCount = (summary: unknown): number | null => {
  const n = (summary as { replays?: unknown } | null)?.replays;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};

onMounted(() => {
  void Promise.allSettled(
    games.map(async (g) => {
      const res = await fetch(g.summaryUrl, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`${g.summaryUrl} → ${res.status}`);
      const n = replayCount(await res.json());
      if (n !== null) counts.value[g.id] = n;
    }),
  );
});

const countFor = (id: string): number | null => counts.value[id] ?? null;
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

/** The hero line upgrades as soon as ANY summary lands — the sum of what has
 *  actually resolved, never a projection over the games still missing. With
 *  nothing resolved (the prerendered state, and the state a fully offline
 *  rollout stays in) the game-count line stands unchanged. */
const resolvedCounts = computed(() =>
  games.map((g) => countFor(g.id)).filter((n): n is number => n !== null),
);
const aggregate = computed(() =>
  resolvedCounts.value.length > 0
    ? `${fmt(resolvedCounts.value.reduce((sum, n) => sum + n, 0))} replays across ${games.length} games`
    : `${games.length} games in the archive`,
);

useSiteMeta({
  title: 'Replay Database — Competitive Fighting-Game Replays',
  description:
    'The competitive fighting-game replay archive. Browse and filter replays for 2XKO, Tekken 8, Street Fighter 6 and MARVEL Tōkon — character usage, matchups, pairings, and meta over time, all in one place.',
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
/* Reserve exactly one line for the replay count so the card's height is the
   same before and after the summary fetch resolves (or fails). */
.count {
  min-height: 1.25rem;
  line-height: 1.25rem;
}
/* The hero pill swaps its text client-side too, and the upgraded string
   ("39,189 replays across 4 games") wraps to two lines on narrow viewports
   where the fallback ("4 games in the archive") does not — which pushed the
   whole card grid down 18px the moment the counts landed (measured at 320 and
   360 px). Below sm, reserve both lines up front; from sm up neither string
   wraps, so the pill keeps its natural single-line height. The breakpoint is
   deliberately the sm boundary rather than the exact wrap width, which migrates
   upward as the archive total gains digits. */
.aggregate {
  min-height: 3.375rem; /* 2 × 1.125rem line + 2 × 0.5rem of py-2 */
}
@media (min-width: 40rem) {
  .aggregate {
    min-height: 0;
  }
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

/* ── the upcoming card ──────────────────────────────────────────────────────
   Structurally a game card, minus everything that implies you can click it: no
   hover lift, no accent border, no ring, and cursor: default. The art is
   desaturated and veiled so the card reads "not yet" rather than "broken"; hover
   lifts both toward normal for pointer users, on top of the badge that is always
   there. Motion is opacity/filter only, which the engine's global
   prefers-reduced-motion reset already neutralizes. */
.upcoming-card {
  border-color: var(--color-border-subtle);
  cursor: default;
}
.art-upcoming {
  filter: saturate(0.62) brightness(0.84);
  transition: filter 0.3s var(--ease-snap);
}
.upcoming-card:hover .art-upcoming {
  filter: saturate(1) brightness(1);
}
.veil {
  background: var(--color-bg);
  opacity: 0.22;
  transition: opacity 0.3s var(--ease-snap);
}
.upcoming-card:hover .veil {
  opacity: 0;
}
/* The badge is the non-hover affordance, so it never dims with the art. */
.badge {
  backdrop-filter: blur(2px);
}
/* Mirrors .count exactly — the reserved line is what keeps this card the same
   height as its neighbour in the grid row. */
.count-slot {
  min-height: 1.25rem;
  line-height: 1.25rem;
}
</style>
