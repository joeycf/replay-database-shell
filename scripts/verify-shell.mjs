import { readFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

/**
 * Shell selector gates (Phase-5 prompt A / D.4 local half) against the BUILT
 * output (.vercel/output/static) — the same mode the games verify in (STACK
 * §5.8: never validate base/theme behavior on the dev server).
 *
 *   1. / renders the selector: umbrella theme (computed --color-primary =
 *      ReplayDB teal), BrandLogo lockup, one card per game with its own accent,
 *      plain-<a> hrefs at /2xko | /tekken, NO game nav (Browse/Stats/…), plus
 *      THREE non-navigable "Coming Soon" cards whose badges are present in the
 *      prerendered HTML without hover or JS, each announcing its own game.
 *   2. ItemList JSON-LD parses and enumerates the live games at apex URLs — and the
 *      sitemap index lists exactly the games that HAVE replays. An
 *      announced-but-unshipped game must reach neither (see lib/games.ts).
 *   3. The selector's /changelog link sits between the aggregate and the cards
 *      and carries the newest entry's date.
 *   4. Per-card replay counts + the aggregate hero line, and the POSITIVE
 *      CONTROL: with one game's summary.json blocked, that card omits its count
 *      while the card heights hold and the aggregate sums only what resolved
 *      (Phase 6).
 *   4. /health renders under the shell's minimal chrome (no game nav).
 *   5. 404.html is the designed not-found page.
 *   6. /changelog renders every entry, canonicalizes to the apex, emits WebPage
 *      JSON-LD (never a second ItemList), lands in sitemap-pages.xml, and is
 *      reachable from the footer on every page that wears one — with the
 *      footer's new left column checked for collision at phone widths.
 *   7. No page request escapes the static root (no 404s on assets).
 *
 * Chrome: /usr/bin/google-chrome-stable (STACK §5.9). Static server: local,
 * ephemeral port. Exit non-zero on any failed gate.
 */

const STATIC_DIR = new URL('../.vercel/output/static', import.meta.url).pathname;
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

/**
 * Synthetic game summaries — the local stand-in for the shell's Vercel
 * rewrites. The built static dir holds only the shell's OWN routes; every
 * /<slug>/… path exists solely as an edge rewrite in production, so without
 * this the count behaviour could not be gated before a push.
 *
 * The numbers are deliberately synthetic and of distinct magnitudes: each digit
 * position in the aggregate identifies exactly one contributor, so a mis-sum
 * can't hide behind a plausible-looking total.
 */
const SUMMARIES = {
  '2xko': {
    game: '2xko',
    name: '2XKO',
    replays: 1234,
    players: 100,
    characters: 15,
    updated: '2026-07-26',
  },
  tekken: {
    game: 'tekken8',
    name: 'Tekken 8',
    replays: 20000,
    players: 200,
    characters: 42,
    updated: '2026-07-25',
  },
  sf6: {
    game: 'sf6',
    name: 'Street Fighter 6',
    replays: 300000,
    players: 300,
    characters: 30,
    updated: '2026-07-26',
  },
  tokon: {
    game: 'tokon',
    name: 'MARVEL Tōkon: Fighting Souls',
    replays: 4000000,
    players: 400,
    characters: 21,
    updated: '2026-07-26',
  },
  ffcotw: {
    game: 'ffcotw',
    name: 'FATAL FURY: City of the Wolves',
    replays: 50000000,
    players: 500,
    characters: 30,
    updated: '2026-09-03',
  },
};
/**
 * The changelog, as lib/changelog.ts declares it. Restated rather than imported
 * because this is a plain-node gate and the table is TypeScript — the same
 * trade verify-cutover.mjs makes for GAMES. Restating it IS the drift gate:
 * these three constants and the built page must agree.
 */
/**
 * UPCOMING, as lib/games.ts declares it — announced games with no archive yet.
 * Restated for the same reason SUMMARIES and verify-cutover's GAMES table are:
 * this is a plain-node gate and that table is TypeScript. Restating IS the
 * drift gate. ORDER MATTERS — the cards are asserted positionally against this,
 * so reordering lib/games.ts fails here rather than silently reshuffling the
 * front door.
 */
const UPCOMING = [
  {
    slug: 'ggst',
    name: 'Guilty Gear Strive',
    fullName: 'GUILTY GEAR -STRIVE-',
    accent: '#d9a53a',
  },
  {
    slug: 'avatar',
    name: 'Avatar Legends',
    fullName: 'Avatar Legends: The Fighting Game',
    accent: '#aeacff',
  },
  {
    slug: 'gbvsr',
    name: 'Granblue Rising',
    fullName: 'Granblue Fantasy Versus: Rising',
    accent: '#5569ff',
  },
];

// Derived from the table the page itself renders, so adding a game updates the
// gate and the page together rather than leaving a literal to go stale.
const GAME_COUNT = Object.keys(SUMMARIES).length;
const UPCOMING_COUNT = UPCOMING.length;
const CHANGELOG_ENTRIES = 34;
const CHANGELOG_NEWEST = '2026-09-06';
const CHANGELOG_NEWEST_TEXT = '6 Sep';

/** Slugs the server currently answers for — the positive control drops one. */
const servedSlugs = new Set(Object.keys(SUMMARIES));
const SUMMARY_RE = /^\/([^/]+)\/data\/summary\.json$/;

function serveStatic(rootDir) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);

    const slug = path.match(SUMMARY_RE)?.[1];
    if (slug) {
      if (servedSlugs.has(slug)) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(SUMMARIES[slug]));
      } else {
        // what a game that hasn't shipped its summary yet returns
        res.writeHead(404, { 'content-type': 'text/html' });
        res.end('<h1>No data at this route</h1>');
      }
      return;
    }

    const tryPaths = [path, join(path, 'index.html'), `${path}.html`];
    for (const p of tryPaths) {
      try {
        const full = join(rootDir, p);
        const body = readFileSync(full);
        const ext = p.slice(p.lastIndexOf('.'));
        res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
        res.end(body);
        return;
      } catch {
        /* next candidate */
      }
    }
    try {
      const body = readFileSync(join(rootDir, '404.html'));
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
}

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const server = serveStatic(STATIC_DIR);
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const origin = `http://localhost:${port}`;
console.log(`static server: ${origin} ← ${STATIC_DIR}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const failedRequests = [];
  let currentPage = '(startup)';
  page.on('response', (res) => {
    // /_vercel/* (analytics/speed-insights loaders) exists only on the Vercel
    // platform — a local 404 for those is the off-Vercel no-op, not a defect.
    if (res.status() >= 400 && !new URL(res.url()).pathname.startsWith('/_vercel/')) {
      failedRequests.push(`[${currentPage}] ${res.status()} ${res.url()}`);
    }
  });

  // ── 1. the selector ──────────────────────────────────────────────────────
  console.log('\n[/] selector');
  currentPage = '/';
  await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });

  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
  );
  check(`umbrella --color-primary is ReplayDB teal (${primary})`, primary === '#17cfc8');

  const display = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim(),
  );
  check(`umbrella --font-display is Space Grotesk`, display.includes('Space Grotesk'));

  const logo = await page.evaluate(() => {
    const svg = document.querySelector('main svg[role="img"]');
    return svg ? svg.getAttribute('aria-label') : null;
  });
  check(
    `BrandLogo mark renders in the hero (aria-label=${JSON.stringify(logo)})`,
    logo === 'ReplayDB',
  );

  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('a.game-card')].map((a) => ({
      href: a.getAttribute('href'),
      accent: getComputedStyle(a).getPropertyValue('--accent').trim(),
      name: a.querySelector('.font-display')?.textContent?.trim(),
      art: a.querySelector('img')?.getAttribute('src'),
      artLoaded: a.querySelector('img')?.naturalWidth > 0,
    })),
  );
  check(`5 game cards render`, cards.length === 5, JSON.stringify(cards));
  const two = cards.find((c) => c.href === '/2xko');
  const tek = cards.find((c) => c.href === '/tekken');
  const sf6 = cards.find((c) => c.href === '/sf6');
  const tok = cards.find((c) => c.href === '/tokon');
  const cotw = cards.find((c) => c.href === '/ffcotw');
  check(
    `2XKO card: href=/2xko, accent #ff2e88, art loads`,
    !!two && two.accent === '#ff2e88' && two.name === '2XKO' && two.artLoaded,
  );
  check(
    `Tekken card: href=/tekken, accent #e13048, art loads`,
    !!tek && tek.accent === '#e13048' && tek.name === 'Tekken 8' && tek.artLoaded,
  );
  check(
    `SF6 card: href=/sf6, accent #ff7d00, art loads`,
    !!sf6 && sf6.accent === '#ff7d00' && sf6.name === 'Street Fighter 6' && sf6.artLoaded,
  );
  check(
    `Tōkon card: href=/tokon, accent #03a5fe, art loads`,
    !!tok && tok.accent === '#03a5fe' && tok.name === 'MARVEL Tōkon' && tok.artLoaded,
  );
  check(
    `CotW card: href=/ffcotw, accent #ffd21f, art loads`,
    !!cotw && cotw.accent === '#ffd21f' && cotw.name === 'FATAL FURY: CotW' && cotw.artLoaded,
  );

  // The card-count selector above is ANCHOR-scoped (`a.game-card`). Assert the
  // CLASS-only selector too: there are three non-anchor coming-soon cards in
  // the same grid, and if someone reuses .game-card on one it inherits the
  // hover-lift and the accent border. This fails HERE, loudly, instead of
  // quietly shipping something that looks clickable and is not.
  const gameCardClass = await page.evaluate(() => document.querySelectorAll('.game-card').length);
  check(
    `.game-card is the ${GAME_COUNT} LIVE cards and nothing else`,
    gameCardClass === GAME_COUNT,
    `${gameCardClass} found`,
  );

  // The changelog's front-door entry point. Asserted here, not just in the
  // footer block, because this one is a HERO element: it sits between the
  // aggregate and the card grid, so if it ever renders at zero size or loses
  // its href the page looks unchanged while the link is simply gone.
  const cta = await page.evaluate(() => {
    const a = document.querySelector('a.changelog-cta');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    const grid = document.querySelector('section[aria-label="Games"]')?.getBoundingClientRect();
    return {
      href: a.getAttribute('href'),
      text: a.textContent.replace(/\s+/g, ' ').trim(),
      visible: r.width > 0 && r.height > 0,
      // It must sit BETWEEN the aggregate pill and the cards, which is the
      // whole point of its placement.
      belowPill:
        r.top > (document.querySelector('p.aggregate')?.getBoundingClientRect().bottom ?? 0),
      aboveGrid: !!grid && r.bottom <= grid.top,
    };
  });
  check(
    `selector links to /changelog above the card grid (${JSON.stringify(cta)})`,
    !!cta && cta.href === '/changelog' && cta.visible && cta.belowPill && cta.aboveGrid,
  );
  // The date is DERIVED from the newest entry, so a stale literal here is the
  // failure this catches — it is the one number on the selector that is not
  // fetched at runtime.
  check(
    `its date is the newest changelog entry (${JSON.stringify(cta?.text)})`,
    !!cta && cta.text.includes(CHANGELOG_NEWEST_TEXT),
  );

  const navLeak = await page.evaluate(
    () =>
      [
        ...document.querySelectorAll(
          'a[href="/stats"], a[href="/players"], a[href="/champions"], a[href="/characters"]',
        ),
      ].length,
  );
  check(`no game-nav links on the selector`, navLeak === 0, `${navLeak} found`);

  const jsonLd = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    return scripts.map((s) => JSON.parse(s.textContent));
  });
  const itemList = jsonLd.find((n) => n['@type'] === 'ItemList');
  check(
    `ItemList JSON-LD parses with all five games at apex URLs`,
    !!itemList &&
      itemList.itemListElement?.length === 5 &&
      itemList.itemListElement[0].url === 'https://replaydatabase.com/2xko' &&
      itemList.itemListElement[1].url === 'https://replaydatabase.com/tekken' &&
      itemList.itemListElement[2].url === 'https://replaydatabase.com/sf6' &&
      itemList.itemListElement[3].url === 'https://replaydatabase.com/tokon' &&
      itemList.itemListElement[4].url === 'https://replaydatabase.com/ffcotw',
    JSON.stringify(itemList),
  );
  // THE load-bearing guard for coming-soon games. An upcoming game in
  // structured data is a lie to search engines, so the ItemList must carry the
  // games that actually have replays and nothing else. lib/games.ts makes that
  // structural (UpcomingGame has no `url` field at all) — this proves it holds.
  // Substring match on the slug, which is safe here and worth checking stays
  // safe: none of ggst / avatar / gbvsr occurs inside a live game's name or URL.
  const itemListJson = JSON.stringify(itemList?.itemListElement ?? []).toLowerCase();
  check(
    `ItemList carries NO upcoming game (${UPCOMING.map((u) => u.slug).join(', ')})`,
    !UPCOMING.some((u) => itemListJson.includes(u.slug)),
    itemListJson,
  );

  // ── 1a. the sitemap index, same guard ────────────────────────────────────
  // Read off disk rather than over the wire: the index is written by
  // modules/sitemap-index.ts on prerender:done, and it is a build artifact, not
  // a route. Exactly one <sitemap> per game plus the shell's own page sitemap.
  const sitemapIndex = readFileSync(join(STATIC_DIR, 'sitemap.xml'), 'utf8');
  const sitemapChildren = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(
    `sitemap index lists exactly 5 game children + the page sitemap (${sitemapChildren.length})`,
    sitemapChildren.length === 6 &&
      sitemapChildren.includes('https://replaydatabase.com/sitemap-pages.xml') &&
      ['2xko', 'tekken', 'sf6', 'tokon', 'ffcotw'].every((s) =>
        sitemapChildren.includes(`https://replaydatabase.com/${s}/sitemap.xml`),
      ),
    sitemapChildren.join(', '),
  );
  check(
    `sitemap index carries NO upcoming game`,
    !UPCOMING.some((u) => sitemapIndex.toLowerCase().includes(u.slug)),
    sitemapChildren.join(', '),
  );

  // ── 1a2. the coming-soon cards ───────────────────────────────────────────
  // No hover simulation anywhere in this block — that is the point. There is no
  // hover on touch, so a hover-only "Coming Soon" reveal would leave the card
  // looking broken on a phone.
  const up = await page.evaluate(() =>
    [...document.querySelectorAll('.upcoming-card')].map((el) => {
      const badge = el.querySelector('.badge');
      const rect = badge?.getBoundingClientRect();
      const cs = badge ? getComputedStyle(badge) : null;
      const img = el.querySelector('img');
      return {
        tag: el.tagName,
        text: el.textContent.replace(/\s+/g, ' ').trim(),
        hasHref: el.hasAttribute('href'),
        insideAnchor: el.closest('a') !== null,
        anchorsWithin: el.querySelectorAll('a[href]').length,
        focusable: el.hasAttribute('tabindex'),
        accent: getComputedStyle(el).getPropertyValue('--accent').trim(),
        badgeText: badge?.textContent.trim() ?? null,
        badgeVisible: !!cs && cs.opacity !== '0' && cs.visibility !== 'hidden' && rect.width > 0,
        name: el.querySelector('.font-display')?.textContent.trim() ?? null,
        alt: img?.getAttribute('alt') ?? null,
        artWidth: img?.naturalWidth ?? 0,
      };
    }),
  );
  check(
    `${UPCOMING_COUNT} upcoming cards render`,
    up.length === UPCOMING_COUNT,
    JSON.stringify(up),
  );

  // Positional against the restated table: order is display order, so a
  // reordered lib/games.ts fails here rather than reshuffling the door quietly.
  UPCOMING.forEach((want, i) => {
    const u = up[i];
    check(
      `upcoming[${i}] ${want.name}: not navigable (tag=${u?.tag}, href=${u?.hasHref}, inside <a>=${u?.insideAnchor}, anchors within=${u?.anchorsWithin}, tabindex=${u?.focusable})`,
      !!u &&
        u.tag !== 'A' &&
        !u.hasHref &&
        !u.insideAnchor &&
        u.anchorsWithin === 0 &&
        !u.focusable,
      JSON.stringify(u),
    );
    check(
      `upcoming[${i}] ${want.name}: "Coming Soon" badge in the DOM and visible WITHOUT hover`,
      !!u && u.badgeText === 'Coming Soon' && u.badgeVisible,
      JSON.stringify(u),
    );
    check(
      `upcoming[${i}] ${want.name}: title, accent ${want.accent}, art at 1200px (${u?.name}, ${u?.accent}, ${u?.artWidth})`,
      !!u && u.name === want.name && u.accent === want.accent && u.artWidth === 1200,
      JSON.stringify(u),
    );
    // The alt was a hard-coded literal on a v-for until this batch: every card
    // announced itself as MARVEL Tōkon. It is bound to `fullName` now, so the
    // alt is the one place the FULL official title reaches a screen reader.
    check(
      `upcoming[${i}] ${want.name}: alt names its own game (${JSON.stringify(u?.alt)})`,
      !!u?.alt && u.alt.includes(want.fullName),
      JSON.stringify(u?.alt),
    );
    check(
      `upcoming[${i}] ${want.name}: carries no date (a date in the card would go stale on its own)`,
      // Whole words only — an unanchored month prefix matches "MARvel".
      !!u &&
        !/\b(20\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b\s+\d/i.test(u.text) &&
        !/\b20\d\d\b/.test(u.text),
      u?.text,
    );
  });
  // One literal shared across a v-for is the exact bug this batch fixed; a
  // count check alone would not have caught it, since three identical alts are
  // still three alts.
  const alts = up.map((u) => u.alt);
  check(
    `the coming-soon alts are distinct (${new Set(alts).size} for ${up.length} cards)`,
    new Set(alts).size === up.length,
    alts.join(' | '),
  );

  // The checks above read the hydrated DOM. The SERVED html is the stronger
  // proof: the announcement needs neither hover nor JavaScript, and nothing on
  // the page links at a slug these games do not own yet.
  const servedHtml = readFileSync(join(STATIC_DIR, 'index.html'), 'utf8');
  check(
    `"Coming Soon" appears ${UPCOMING_COUNT}× in the PRERENDERED html (no JS needed)`,
    (servedHtml.match(/Coming Soon/g) ?? []).length === UPCOMING_COUNT,
    `${(servedHtml.match(/Coming Soon/g) ?? []).length} found`,
  );
  for (const u of UPCOMING) {
    check(
      `prerendered html has no /${u.slug} link`,
      !new RegExp(`href="[^"]*/${u.slug}`).test(servedHtml),
      servedHtml.match(new RegExp(`href="[^"]*${u.slug}[^"]*"`, 'g'))?.join(', '),
    );
  }

  // ── 1b. per-card counts + the aggregate line (Phase 6) ───────────────────
  console.log('\n[/] counts');
  const fmt = (n) => n.toLocaleString('en-US');
  /** Wait for exactly `n` cards to carry a non-empty count line. */
  const waitForCounts = (n) =>
    page.waitForFunction(
      (expected) =>
        [...document.querySelectorAll('a.game-card .count')].filter((el) => el.textContent.trim())
          .length === expected,
      { timeout: 10000 },
      n,
    );
  /**
   * Text + the layout-shift evidence. `gridTop` is the one that matters: BOTH
   * count surfaces are swapped client-side, and an earlier revision reserved
   * only the card line — the hero pill still reflowed one line → two on narrow
   * viewports and pushed the whole grid down 18px, invisible to a card-height
   * check at 1280px. Measure where the grid actually starts.
   */
  const readSelector = () =>
    page.evaluate(() => ({
      cards: Object.fromEntries(
        [...document.querySelectorAll('a.game-card')].map((a) => [
          a.getAttribute('href'),
          {
            count: a.querySelector('.count')?.textContent.trim() ?? null,
            height: Math.round(a.getBoundingClientRect().height),
          },
        ]),
      ),
      aggregate: document.querySelector('p.aggregate')?.textContent.trim() ?? '',
      pillHeight: Math.round(
        document.querySelector('p.aggregate')?.getBoundingClientRect().height ?? -1,
      ),
      gridTop: Math.round(
        (document.querySelector('section[aria-label="Games"]')?.getBoundingClientRect().top ?? -1) +
          window.scrollY,
      ),
    }));

  await waitForCounts(5).catch(() => {});
  const all = await readSelector();
  for (const [slug, s] of Object.entries(SUMMARIES)) {
    const href = `/${slug}`;
    check(
      `${slug} card shows its count (${JSON.stringify(all.cards[href]?.count)})`,
      all.cards[href]?.count === `${fmt(s.replays)} replays`,
    );
  }
  const allTotal = Object.values(SUMMARIES).reduce((sum, s) => sum + s.replays, 0);
  check(
    `aggregate sums all five (${JSON.stringify(all.aggregate)})`,
    all.aggregate === `${fmt(allTotal)} replays across 5 games`,
  );

  await page.screenshot({
    path: process.env.SHOT_PATH || '/tmp/shell-selector.png',
    fullPage: true,
  });

  // ── 1c. POSITIVE CONTROL: block summaries ────────────────────────────────
  // The graceful path has to be exercised, not assumed. Two blocked states,
  // because they fail differently:
  //
  //   ONE blocked  — that card omits its count and drops out of the aggregate
  //                  while the other two are untouched.
  //   ALL blocked  — the state every visitor sees on first paint (the counts
  //                  are fetched client-side, so the prerendered HTML has
  //                  none) and the state a fully-offline rollout stays in.
  //                  THIS is where the reserved line earns its keep: the grid
  //                  row stretches every card to the tallest, so losing one
  //                  card's count can't move anything — only losing them ALL
  //                  can, and that is exactly the first-paint → counts-arrive
  //                  transition a real visitor sees.
  const heightsOf = (s) =>
    `cards ${Object.values(s.cards)
      .map((c) => c.height)
      .join('/')} · pill ${s.pillHeight} · gridTop ${s.gridTop}`;
  const sameLayout = (a, b) =>
    Object.keys(a.cards).every((href) => a.cards[href].height === b.cards[href]?.height) &&
    a.pillHeight === b.pillHeight &&
    a.gridTop === b.gridTop;

  console.log('\n[/] positive control — /sf6/data/summary.json blocked');
  const BLOCKED = 'sf6';
  servedSlugs.delete(BLOCKED);
  currentPage = '/ (summary blocked)';
  await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
  await waitForCounts(4).catch(() => {});
  const partial = await readSelector();

  check(
    `blocked ${BLOCKED} card omits its count (${JSON.stringify(partial.cards[`/${BLOCKED}`]?.count)})`,
    partial.cards[`/${BLOCKED}`]?.count === '',
  );
  const partialTotal = allTotal - SUMMARIES[BLOCKED].replays;
  check(
    `aggregate sums only the four that resolved (${JSON.stringify(partial.aggregate)})`,
    partial.aggregate === `${fmt(partialTotal)} replays across 5 games`,
  );
  for (const slug of Object.keys(SUMMARIES).filter((s) => s !== BLOCKED)) {
    check(
      `${slug} card unaffected by the block`,
      partial.cards[`/${slug}`]?.count === `${fmt(SUMMARIES[slug].replays)} replays`,
    );
  }
  check(
    `layout intact with one blocked (${heightsOf(partial)} vs ${heightsOf(all)})`,
    sameLayout(all, partial),
    JSON.stringify({ served: all, blocked: partial }),
  );

  await page.screenshot({
    path: process.env.SHOT_BLOCKED_PATH || '/tmp/shell-selector-blocked.png',
    fullPage: true,
  });

  console.log('\n[/] positive control — every summary blocked (the first-paint state)');
  for (const slug of Object.keys(SUMMARIES)) servedSlugs.delete(slug);
  currentPage = '/ (summary blocked)';
  await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
  // nothing to wait FOR here — waitForCounts(0) is true before a single fetch
  // has even failed, so settle on the requests themselves instead
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
  const none = await readSelector();
  for (const slug of Object.keys(SUMMARIES)) servedSlugs.add(slug);

  check(
    `every card omits its count (${JSON.stringify(Object.values(none.cards).map((c) => c.count))})`,
    Object.values(none.cards).every((c) => c.count === ''),
  );
  check(
    `aggregate falls back to the game count (${JSON.stringify(none.aggregate)})`,
    none.aggregate === '5 games in the archive',
  );
  check(
    `NO layout shift when the counts arrive (${heightsOf(none)} → ${heightsOf(all)})`,
    sameLayout(all, none),
    JSON.stringify({ none, served: all }),
  );

  // ── 1d. the same transition at PHONE widths ──────────────────────────────
  // 1280px is where this check is blind: the hero pill fits on one line either
  // way there, so the reflow that pushed the grid down only shows up narrow.
  // These are the widths where the fallback string and the upgraded string
  // genuinely differ in line count.
  console.log('\n[/] no layout shift at phone widths');
  for (const width of [320, 360, 375]) {
    const states = [];
    for (const served of [false, true]) {
      for (const slug of Object.keys(SUMMARIES)) {
        if (served) servedSlugs.add(slug);
        else servedSlugs.delete(slug);
      }
      currentPage = served ? '/' : '/ (summary blocked)';
      await page.setViewport({ width, height: 900 });
      await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
      if (served) await waitForCounts(5).catch(() => {});
      else await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
      states.push(await readSelector());
    }
    const [before, after] = states;
    check(
      `${width}px: grid holds its position (top ${before.gridTop} → ${after.gridTop}, pill ${before.pillHeight} → ${after.pillHeight})`,
      before.gridTop === after.gridTop && before.pillHeight === after.pillHeight,
      JSON.stringify({ before, after }),
    );
  }
  await page.setViewport({ width: 1280, height: 900 });

  // ── 1e. the grid regimes ─────────────────────────────────────────────────
  // 380 = 1-up (grid-cols-1), 640 = the sm 2-up boundary (40rem), 1024 = 2-up
  // still, proving xl has NOT fired below its boundary, 1280 = the xl 3-up
  // boundary itself, 1440 = where max-w-[1440px] caps and the card reaches its
  // full width.
  //
  // THE THIRD COLUMN CAME BACK. It was removed in 5731651 ("max cards to 2 per
  // row") and the note here argued the cap from that revert: at lg inside
  // max-w-[1120px] the card fell 514px → 333px and every tagline truncated.
  // Both terms have moved — xl rather than lg, 1440 rather than 1120, so the
  // narrowest 3-up card is ~382px — and the tagline no longer truncates at any
  // width, because the "Browse →" CTA left its line box and it now reserves two
  // lines. The truncation was never the third column's doing in the first
  // place: the narrowest card on this page is the sm 2-up at 640, and all five
  // taglines were already clipped there on the shipped page.
  //
  // NOTE the scrollbar. `scrollbar-gutter: stable` (engine index.css) makes the
  // layout box 15px narrower than the viewport, while @media matches the
  // viewport INCLUDING it — so xl fires at exactly 1280 while the content box
  // is 1265. Every card width below is off the 1265, not the 1280.
  //
  // THIS USED TO ASSERT THAT EVERY ROW IS FULL, which was true of four cards in
  // a 2-up grid and is arithmetically impossible for five. The invariant that
  // actually matters is not evenness — it is that no card is a different size
  // from its peers. So: all cards the same width, every row full EXCEPT
  // possibly the last, and cards sharing a row level with each other. An odd
  // game count leaves a gap in the final row and that is a fact about counting,
  // not a defect; a card that is narrower than its neighbours is a defect.
  // Equal widths is the "not squeezed" half; equal row heights is what the
  // upcoming card's reserved .count-slot buys — and row 3 is now a MIXED row,
  // a live card with a rendered count beside an announced one without, so that
  // reservation is load-bearing again for the first time since Tōkon.
  //
  // `grid.children` counts EVERY grid child, live and upcoming — so this is the
  // count that must be the total, not GAME_COUNT. It is also the ONLY clause
  // here that catches a missing tile: the "only the last row short" logic
  // happily accepts [2,2,2,1] at seven cards, because that is a legal shape for
  // an odd total. Drop a card from either array and this is what fails.
  console.log('\n[/] grid regimes');
  const SHOT_DIR = process.env.SHOT_DIR || '/tmp';
  for (const width of [380, 640, 1024, 1280, 1440]) {
    await page.setViewport({ width, height: 1400 });
    currentPage = `/ (${width}px)`;
    await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
    await waitForCounts(5).catch(() => {});
    const grid = await page.evaluate(() => {
      const sec = document.querySelector('section[aria-label="Games"]');
      const kids = [...sec.children];
      const top = (k) => Math.round(k.getBoundingClientRect().top);
      const rows = [...new Set(kids.map(top))];
      return {
        cols: getComputedStyle(sec).gridTemplateColumns.split(' ').length,
        children: kids.length,
        perRow: rows.map((t) => kids.filter((k) => top(k) === t).length),
        widths: kids.map((k) => Math.round(k.getBoundingClientRect().width)),
        // Grouped BY ROW: stacked 1-up cards are allowed to differ, but two
        // cards sharing a row must not — that is what the reserved count line
        // on the upcoming card is for.
        rowHeights: rows.map((t) =>
          kids.filter((k) => top(k) === t).map((k) => Math.round(k.getBoundingClientRect().height)),
        ),
      };
    });
    const perRow = width < 640 ? 1 : width < 1280 ? 2 : 3;
    const expectedCards = GAME_COUNT + UPCOMING_COUNT;
    const full = grid.perRow.slice(0, -1);
    const last = grid.perRow[grid.perRow.length - 1];
    check(
      `${width}px: ${expectedCards} cards in ${grid.cols} col(s), rows ${JSON.stringify(grid.perRow)}, widths ${JSON.stringify(grid.widths)} — none squeezed, only the last row short`,
      grid.children === expectedCards &&
        grid.cols === perRow &&
        full.every((n) => n === perRow) &&
        last >= 1 &&
        last <= perRow &&
        new Set(grid.widths).size === 1,
      JSON.stringify(grid),
    );
    check(
      `${width}px: every grid row is level (${JSON.stringify(grid.rowHeights)})`,
      grid.rowHeights.every((row) => new Set(row).size === 1),
      JSON.stringify(grid.rowHeights),
    );

    // ── the two things the copy rewrite actually needs gated ───────────────
    // Neither existed before, and their absence is why five taglines shipped
    // ellipsized at 640 and four of them shipped saying the same sentence.
    // Rows being level (above) cannot catch either: grid stretches items to
    // their row's height whatever the text inside them does.
    const text = await page.evaluate(() => {
      const q = (sel) => [...document.querySelectorAll(`section[aria-label="Games"] ${sel}`)];
      return {
        taglines: q('.tagline').map((el) => ({
          text: el.textContent.trim(),
          // A clamped line reports more scrollHeight than it shows. +1 absorbs
          // sub-pixel line-box rounding, not a whole extra line (16px).
          clipped: el.scrollHeight > el.clientHeight + 1,
        })),
        titles: q('.font-display').map((el) => ({
          text: el.textContent.trim(),
          lines: Math.round(
            el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
          ),
        })),
      };
    });
    check(
      `${width}px: all ${expectedCards} taglines render and none clips`,
      text.taglines.length === expectedCards && text.taglines.every((t) => !t.clipped),
      JSON.stringify(text.taglines),
    );
    // The short-name rule in lib/games.ts (`name` is the SHORT title, because a
    // wrapped title makes its row taller than its neighbour's) was prose and a
    // README paragraph until now. This is it as a gate.
    check(
      `${width}px: every card title is one line`,
      text.titles.length === expectedCards && text.titles.every((t) => t.lines === 1),
      JSON.stringify(text.titles),
    );
    // Distinctness is the durable one: it is what stops the next game's card
    // being handed a fifth variation of "Character usage · … · meta over time".
    // Asserted once, at the first regime — the strings do not vary by width.
    if (width === 380) {
      const seen = text.taglines.map((t) => t.text);
      check(
        `the ${seen.length} taglines are distinct`,
        new Set(seen).size === seen.length,
        seen.join(' | '),
      );
    }
    await page.screenshot({ path: `${SHOT_DIR}/shell-selector-${width}.png`, fullPage: true });
  }
  await page.setViewport({ width: 1280, height: 900 });

  // ── 2. /health under the shell chrome ────────────────────────────────────
  console.log('\n[/health]');
  currentPage = '/health';
  await page.goto(`${origin}/health`, { waitUntil: 'networkidle0' });
  const healthNav = await page.evaluate(() => ({
    navLinks: [...document.querySelectorAll('header nav a')].length,
    wordmark: document.querySelector('header a')?.textContent?.trim(),
    h1: document.querySelector('h1')?.textContent?.trim(),
    baseURL: [...document.querySelectorAll('dd')].map((d) => d.textContent.trim()),
  }));
  check(`/health renders (h1=Health)`, healthNav.h1 === 'Health');
  check(
    `shell chrome: umbrella wordmark, NO game nav`,
    healthNav.navLinks === 0 && healthNav.wordmark === 'ReplayDB',
  );
  check(
    `GameConfig shows umbrella identity (name=Replay Database)`,
    healthNav.baseURL.includes('Replay Database'),
  );

  // ── 3. designed 404 ──────────────────────────────────────────────────────
  console.log('\n[404]');
  currentPage = '/definitely-not-a-route';
  await page.goto(`${origin}/definitely-not-a-route`, { waitUntil: 'networkidle0' });
  const nf = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
  check(
    `designed 404 serves for unknown paths`,
    nf === 'No data at this route',
    `h1=${JSON.stringify(nf)}`,
  );

  // ── 4. /changelog ────────────────────────────────────────────────────────
  // The apex's editorial page. Its real failure mode is SILENCE: with
  // crawlLinks:false the route only exists because nuxt.config.ts seeds it, so
  // dropping that seed leaves a page that builds clean, works in dev, and ships
  // as a 404 nobody notices. Everything here is checked against the BUILT
  // output for that reason.
  console.log('\n[/changelog]');
  currentPage = '/changelog';
  await page.goto(`${origin}/changelog`, { waitUntil: 'networkidle0' });

  const log = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    entries: document.querySelectorAll('main ol > li').length,
    months: document.querySelectorAll('main section > h2').length,
    canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
    // Badge tint is inline per entry (the accent is per-GAME data, not a token),
    // so read the computed colors and count the distinct ones.
    badgeColors: [...document.querySelectorAll('main ol > li .badge')].map(
      (b) => getComputedStyle(b).color,
    ),
    // Dates must survive prerender as the authored day. A `new Date(iso)` parse
    // would render UTC-midnight as the PREVIOUS day in any negative timezone,
    // and the static HTML is what a visitor sees before hydration.
    firstDate: document.querySelector('main ol > li time')?.getAttribute('datetime') ?? null,
    firstDateText: document.querySelector('main ol > li time')?.textContent?.trim() ?? null,
    jsonLdTypes: (() => {
      try {
        return [...document.querySelectorAll('script[type="application/ld+json"]')]
          .map((n) => JSON.parse(n.textContent)['@type'])
          .sort();
      } catch {
        return ['(unparseable)'];
      }
    })(),
  }));

  check(`/changelog renders (h1=${JSON.stringify(log.h1)})`, log.h1 === 'Changelog');
  check(
    `all ${CHANGELOG_ENTRIES} entries render (${log.entries}) across ${log.months} month section(s)`,
    log.entries === CHANGELOG_ENTRIES && log.months > 0,
  );
  check(
    `canonical is the apex /changelog (${log.canonical})`,
    log.canonical === 'https://replaydatabase.com/changelog',
  );
  check(
    `first entry's date renders as its authored day, not UTC-shifted (${log.firstDate} → ${JSON.stringify(log.firstDateText)})`,
    log.firstDate === CHANGELOG_NEWEST && log.firstDateText === CHANGELOG_NEWEST_TEXT,
  );
  // One badge per entry, and the palette is the FIVE game accents plus the
  // umbrella teal for the platform-wide scopes — six distinct colors. Fewer
  // means a scope silently fell through to the fallback (the tekken8-vs-tekken
  // trap: lib/games.ts keys on `id`, the changelog on `slug`).
  check(
    `every entry carries a scope badge (${log.badgeColors.length})`,
    log.badgeColors.length === CHANGELOG_ENTRIES,
  );
  const distinctBadges = new Set(log.badgeColors);
  check(
    `badges use all 5 game accents + the umbrella teal (${distinctBadges.size} distinct)`,
    distinctBadges.size === 6,
    [...distinctBadges].join(', '),
  );
  // The selector's ItemList must not follow us here, and nothing on this page
  // may claim to be one: useJsonLd appends, so a stray ItemList would make the
  // apex's structured data ambiguous.
  check(
    `JSON-LD is WebPage only, no ItemList (${log.jsonLdTypes.join(', ')})`,
    log.jsonLdTypes.includes('WebPage') && !log.jsonLdTypes.includes('ItemList'),
  );

  // The page sitemap, read off disk for the same reason the index is: it is a
  // build artifact written on prerender:done, not a route. This is the
  // assertion that fails if the prerender seed is ever dropped.
  const pagesSitemap = readFileSync(join(STATIC_DIR, 'sitemap-pages.xml'), 'utf8');
  const pageLocs = [...pagesSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(
    `sitemap-pages.xml lists / and /changelog (${pageLocs.length} urls)`,
    pageLocs.includes('https://replaydatabase.com/') &&
      pageLocs.includes('https://replaydatabase.com/changelog'),
    pageLocs.join(', '),
  );

  // The footer link comes from the ENGINE as of v0.7.1, and it is ABSOLUTE —
  // the same component renders inside a game, where a root-relative href would
  // 404 on that game's own *.vercel.app host. Asserting the absolute apex form
  // is what catches a regression to a bare '/changelog'.
  console.log('\n[footer]');
  for (const path of ['/', '/health', '/changelog']) {
    currentPage = path;
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle0' });
    const footerLink = await page.evaluate(() => {
      const a = document.querySelector('footer a[href$="/changelog"]');
      return a
        ? {
            href: a.getAttribute('href'),
            text: a.textContent.trim(),
            visible: a.getBoundingClientRect().width > 0,
          }
        : null;
    });
    check(
      `${path}: footer links to the apex changelog (${JSON.stringify(footerLink)})`,
      !!footerLink &&
        footerLink.href === 'https://replaydatabase.com/changelog' &&
        footerLink.text === 'Changelog' &&
        footerLink.visible,
    );
  }

  // Phone widths: the footer's left column was EMPTY below lg before this link
  // existed, so the link is new content in the tightest row on the page, and
  // /changelog itself must not introduce a horizontal scrollbar.
  console.log('\n[/changelog at phone widths]');
  for (const width of [320, 360, 380]) {
    await page.setViewport({ width, height: 900 });
    for (const path of ['/', '/changelog']) {
      currentPage = `${path} (${width}px)`;
      await page.goto(`${origin}${path}`, { waitUntil: 'networkidle0' });
      const fit = await page.evaluate(() => {
        const foot = document.querySelector('footer');
        const link = document.querySelector('footer a[href$="/changelog"]');
        const bmc = document.querySelector('footer a[target="_blank"]');
        const box = (el) => (el ? el.getBoundingClientRect() : null);
        const l = box(link);
        const b = box(bmc);
        return {
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          footerOverflow: foot ? foot.scrollWidth > foot.clientWidth : true,
          // The two footer items must not collide — the grid keeps BMC centered
          // only while column 1 fits.
          collides: !!(l && b) && l.right > b.left,
        };
      });
      check(
        `${width}px ${path}: no page or footer overflow, footer items clear (${JSON.stringify(fit)})`,
        !fit.overflow && !fit.footerOverflow && !fit.collides,
      );
    }
  }
  await page.setViewport({ width: 1280, height: 900 });
  currentPage = '/changelog';
  await page.goto(`${origin}/changelog`, { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: process.env.SHOT_CHANGELOG_PATH || '/tmp/shell-changelog.png',
    fullPage: true,
  });

  // ── 5. request hygiene ───────────────────────────────────────────────────
  console.log('\n[requests]');
  const unexpected = failedRequests.filter(
    (r) =>
      !r.includes('/definitely-not-a-route') &&
      // the positive control's deliberate 404 — the whole point of that pass
      !r.startsWith('[/ (summary blocked)] 404'),
  );
  check(
    `no failed asset/data requests across all pages`,
    unexpected.length === 0,
    unexpected.join(', '),
  );
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
