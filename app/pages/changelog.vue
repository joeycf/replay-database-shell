<template>
  <div class="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8 md:pb-24">
    <header class="border-b border-border-subtle pb-8 pt-12 md:pb-10 md:pt-16">
      <h1 class="font-display text-d1 font-bold text-text">Changelog</h1>
      <p class="mt-3 max-w-2xl font-ui text-sub text-text-secondary">
        What's changed on Replay Database: games joining, new filters, new sources of matches.
        Newest first.
      </p>
    </header>

    <section
      v-for="group in months"
      :key="group.key"
      class="border-b border-border-subtle py-8 last:border-b-0 md:py-10"
    >
      <h2
        class="mb-6 font-ui text-[10px] font-semibold uppercase tracking-label text-text-muted md:mb-7"
      >
        {{ group.label }}
      </h2>

      <ol class="flex flex-col gap-7 md:gap-8">
        <li
          v-for="entry in group.entries"
          :key="`${entry.date}-${entry.title}`"
          class="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-[8.5rem_minmax(0,1fr)]"
        >
          <!-- The meta column: the date, then the scope badge tinted with that
               game's own accent. Stacks above the entry below md rather than
               squeezing into a narrow column. -->
          <div class="flex flex-wrap items-center gap-3 md:flex-col md:items-start md:gap-2.5">
            <time
              :datetime="entry.date"
              class="font-mono text-[11px] text-text-muted"
            >
              {{ formatDate(entry.date) }}
            </time>
            <span
              class="badge border bg-surface-sunken/90 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-label cut-sm"
              :style="{ color: accentFor(entry.scope), borderColor: accentFor(entry.scope) }"
            >
              {{ scopeLabel(entry.scope) }}
            </span>
          </div>

          <div class="min-w-0">
            <h3 class="font-display text-title font-bold text-text">
              <a
                v-if="entry.href"
                :href="entry.href"
                class="transition-colors duration-normal hover:text-primary"
                >{{ entry.title }}</a
              >
              <template v-else>{{ entry.title }}</template>
            </h3>
            <p class="mt-2 font-ui text-body leading-relaxed text-text-secondary">
              {{ entry.body }}
            </p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ChangelogEntry, Scope } from '~~/lib/changelog';

/**
 * The platform changelog — the apex's one editorial page, and the only surface
 * that reads lib/changelog.ts.
 *
 * Wears the shell's DEFAULT layout (umbrella wordmark + shared footer), unlike
 * the selector, which supplies its own chrome under `layout: false`. This is the
 * same chrome /health and the designed 404 already use.
 *
 * NOTE for whoever adds a route next: `crawlLinks: false` is load-bearing in
 * nuxt.config.ts, so being linked from the footer does NOT get this page
 * prerendered — it is seeded explicitly in `nitro.prerender.routes`. Without
 * that seed this file builds, renders in dev, and silently ships as nothing.
 */
const entries = useAppConfig().changelog as ChangelogEntry[];
const games = useAppConfig().games;

/**
 * Scope → the colour its badge wears. The four game scopes borrow that game's
 * own accent from lib/games.ts, so the changelog is wayfound by the same four
 * identities as the selector cards; platform/engine/shell wear the umbrella
 * teal, because a change to all of them belongs to no single game.
 *
 * Matched on `slug`, NOT `id` — Tekken's id is 'tekken8' while its slug (and
 * its scope here) is 'tekken', so an id match would silently drop to the teal
 * fallback and lose the one badge colour most likely to be noticed missing.
 */
const accentFor = (scope: Scope): string =>
  games.find((g) => g.slug === scope)?.accent ?? 'var(--color-primary)';

/** The badge text. Games use their own wordmark short form so the badge reads
 *  like the card it points at; the three platform-wide scopes are spelled out. */
const SCOPE_LABELS: Record<Scope, string> = {
  platform: 'All games',
  engine: 'All games',
  shell: 'Front door',
  '2xko': '2XKO',
  tekken: 'Tekken 8',
  sf6: 'SF6',
  tokon: 'Tōkon',
};
const scopeLabel = (scope: Scope): string => SCOPE_LABELS[scope] ?? scope;

/** '2026-08-19' → '19 Aug'. Parsed as parts, never `new Date(iso)`, which reads
 *  a bare ISO day as UTC midnight and renders as the day before in any negative
 *  timezone — the prerender would then disagree with the client. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (iso: string): string => {
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  return `${day} ${MONTHS[month - 1]}`;
};

/** Entries grouped into month sections, preserving the table's own order — the
 *  data file is already newest-first and its validator enforces that, so this
 *  never sorts and cannot reorder history behind the author's back. */
const months = computed(() => {
  const groups: { key: string; label: string; entries: ChangelogEntry[] }[] = [];
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.entries.push(entry);
    } else {
      const month = Number(key.slice(5, 7));
      groups.push({ key, label: `${MONTHS[month - 1]} ${key.slice(0, 4)}`, entries: [entry] });
    }
  }
  return groups;
});

useSiteMeta({
  title: 'Changelog — Replay Database',
  description:
    'What has changed on Replay Database: games joining the platform, new filters, new sources of matches, and the archive milestones behind them. Dated, newest first.',
});

// Plain WebPage. The selector's ItemList is on another page and untouched:
// useJsonLd appends its own <script> tags and keeps no shared registry.
useJsonLd([
  {
    '@type': 'WebPage',
    name: 'Changelog — Replay Database',
    url: `${useSiteOrigin()}/changelog`,
    description: 'Dated history of the Replay Database platform, newest first.',
    isPartOf: { '@type': 'WebSite', name: useBrandName(), url: `${useSiteOrigin()}/` },
  },
]);
</script>

<style scoped>
/* Matches the selector's coming-soon badge, the shell's only other accent-tinted
   pill — the tint is inline (per entry) so only the blur belongs here. */
.badge {
  backdrop-filter: blur(2px);
}
</style>
