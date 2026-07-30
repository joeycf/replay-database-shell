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
 *      ONE non-navigable "Coming Soon" card whose badge is present in the
 *      prerendered HTML without hover or JS.
 *   2. ItemList JSON-LD parses and enumerates both games at apex URLs — and the
 *      sitemap index lists exactly the games that HAVE replays. An
 *      announced-but-unshipped game must reach neither (see lib/games.ts).
 *   3. Per-card replay counts + the aggregate hero line, and the POSITIVE
 *      CONTROL: with one game's summary.json blocked, that card omits its count
 *      while the card heights hold and the aggregate sums only what resolved
 *      (Phase 6).
 *   4. /health renders under the shell's minimal chrome (no game nav).
 *   5. 404.html is the designed not-found page.
 *   6. No page request escapes the static root (no 404s on assets).
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
};
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
  check(`3 game cards render`, cards.length === 3, JSON.stringify(cards));
  const two = cards.find((c) => c.href === '/2xko');
  const tek = cards.find((c) => c.href === '/tekken');
  const sf6 = cards.find((c) => c.href === '/sf6');
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

  // The card-count selector above is ANCHOR-scoped (`a.game-card`), so a
  // non-anchor coming-soon card is invisible to it by construction. Assert the
  // CLASS-only selector too: if someone later reuses .game-card on the upcoming
  // card, it inherits the hover-lift and this fails HERE, loudly, instead of
  // quietly shipping a card that looks clickable.
  const gameCardClass = await page.evaluate(() => document.querySelectorAll('.game-card').length);
  check(
    `.game-card is the three LIVE cards and nothing else`,
    gameCardClass === 3,
    `${gameCardClass} found`,
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
    `ItemList JSON-LD parses with all three games at apex URLs`,
    !!itemList &&
      itemList.itemListElement?.length === 3 &&
      itemList.itemListElement[0].url === 'https://replaydatabase.com/2xko' &&
      itemList.itemListElement[1].url === 'https://replaydatabase.com/tekken' &&
      itemList.itemListElement[2].url === 'https://replaydatabase.com/sf6',
    JSON.stringify(itemList),
  );
  // THE load-bearing guard for coming-soon games. An upcoming game in structured
  // data is a lie to search engines, so the ItemList must carry the three games
  // that actually have replays and nothing else. lib/games.ts makes that
  // structural (UPCOMING has no `url` field at all) — this proves it holds.
  check(
    `ItemList carries NO upcoming game`,
    !!itemList &&
      !JSON.stringify(itemList.itemListElement ?? [])
        .toLowerCase()
        .includes('tokon'),
    JSON.stringify(itemList?.itemListElement),
  );

  // ── 1a. the sitemap index, same guard ────────────────────────────────────
  // Read off disk rather than over the wire: the index is written by
  // modules/sitemap-index.ts on prerender:done, and it is a build artifact, not
  // a route. Exactly one <sitemap> per game plus the shell's own page sitemap.
  const sitemapIndex = readFileSync(join(STATIC_DIR, 'sitemap.xml'), 'utf8');
  const sitemapChildren = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(
    `sitemap index lists exactly 3 game children + the page sitemap (${sitemapChildren.length})`,
    sitemapChildren.length === 4 &&
      sitemapChildren.includes('https://replaydatabase.com/sitemap-pages.xml') &&
      ['2xko', 'tekken', 'sf6'].every((s) =>
        sitemapChildren.includes(`https://replaydatabase.com/${s}/sitemap.xml`),
      ),
    sitemapChildren.join(', '),
  );
  check(
    `sitemap index carries NO upcoming game`,
    !sitemapIndex.toLowerCase().includes('tokon'),
    sitemapChildren.join(', '),
  );

  // ── 1a2. the upcoming card: visible, announced, and NOT navigable ────────
  // No hover simulation anywhere in this block — that is the point. There is no
  // hover on touch, so a hover-only "Coming Soon" reveal would leave the card
  // looking broken on a phone.
  const up = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.upcoming-card')];
    return els.map((el) => {
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
        accent: cs && getComputedStyle(el).getPropertyValue('--accent').trim(),
        badgeText: badge?.textContent.trim() ?? null,
        badgeVisible: !!cs && cs.opacity !== '0' && cs.visibility !== 'hidden' && rect.width > 0,
        artWidth: img?.naturalWidth ?? 0,
      };
    });
  });
  check(`1 upcoming card renders`, up.length === 1, JSON.stringify(up));
  const tokon = up[0];
  check(
    `upcoming card is not navigable (tag=${tokon?.tag}, href=${tokon?.hasHref}, inside <a>=${tokon?.insideAnchor}, anchors within=${tokon?.anchorsWithin})`,
    !!tokon &&
      tokon.tag !== 'A' &&
      !tokon.hasHref &&
      !tokon.insideAnchor &&
      tokon.anchorsWithin === 0,
  );
  check(`upcoming card is not in the tab order (no tabindex)`, !!tokon && !tokon.focusable);
  check(
    `"Coming Soon" badge is in the DOM and visible WITHOUT hover (${JSON.stringify(tokon?.badgeText)})`,
    !!tokon && tokon.badgeText === 'Coming Soon' && tokon.badgeVisible,
    JSON.stringify(tokon),
  );
  check(
    `upcoming card: accent #00a6ff, art loads at 1200px (${tokon?.accent}, ${tokon?.artWidth})`,
    !!tokon && tokon.accent === '#00a6ff' && tokon.artWidth === 1200,
  );
  check(
    `upcoming card carries no date (a date in the card would go stale on its own)`,
    // Whole words only — an unanchored month prefix matches "MARvel".
    !!tokon &&
      !/\b(20\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b\s+\d/i.test(tokon.text) &&
      !/\b20\d\d\b/.test(tokon.text),
    tokon?.text,
  );

  // The checks above read the hydrated DOM. The SERVED html is the stronger
  // proof: it shows the announcement needs neither hover nor JavaScript, and
  // that nothing on the page links at the slug the game will one day own.
  const servedHtml = readFileSync(join(STATIC_DIR, 'index.html'), 'utf8');
  check(
    `"Coming Soon" is in the PRERENDERED html (no JS needed)`,
    servedHtml.includes('Coming Soon'),
  );
  check(
    `prerendered html has no /tokon link`,
    !/href="[^"]*\/tokon/.test(servedHtml),
    servedHtml.match(/href="[^"]*tokon[^"]*"/g)?.join(', '),
  );

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

  await waitForCounts(3).catch(() => {});
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
    `aggregate sums all three (${JSON.stringify(all.aggregate)})`,
    all.aggregate === `${fmt(allTotal)} replays across 3 games`,
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
  await waitForCounts(2).catch(() => {});
  const partial = await readSelector();

  check(
    `blocked ${BLOCKED} card omits its count (${JSON.stringify(partial.cards[`/${BLOCKED}`]?.count)})`,
    partial.cards[`/${BLOCKED}`]?.count === '',
  );
  const partialTotal = allTotal - SUMMARIES[BLOCKED].replays;
  check(
    `aggregate sums only the two that resolved (${JSON.stringify(partial.aggregate)})`,
    partial.aggregate === `${fmt(partialTotal)} replays across 3 games`,
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
    none.aggregate === '3 games in the archive',
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
      if (served) await waitForCounts(3).catch(() => {});
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

  // ── 1e. the grid holds four cards in every regime ────────────────────────
  // 380 = 1-up (grid-cols-1), 640 = the sm 2-up boundary (40rem), 1280 = the
  // max-w-[1120px] 2-up. FOUR cards therefore fill an even 2×2 from sm up. There
  // is deliberately no lg:grid-cols-3 — commit 5731651 removed it ("max cards to
  // 2 per row"), and re-adding it would orphan the fourth card on its own row.
  // Equal widths per row is the "not squeezed" half; equal row heights is what
  // the upcoming card's reserved .count-slot buys.
  console.log('\n[/] grid regimes');
  const SHOT_DIR = process.env.SHOT_DIR || '/tmp';
  for (const width of [380, 640, 1280]) {
    await page.setViewport({ width, height: 1400 });
    currentPage = `/ (${width}px)`;
    await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });
    await waitForCounts(3).catch(() => {});
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
    const perRow = width < 640 ? 1 : 2;
    check(
      `${width}px: 4 cards in ${grid.cols} col(s), rows ${JSON.stringify(grid.perRow)}, widths ${JSON.stringify(grid.widths)} — no orphan, none squeezed`,
      grid.children === 4 &&
        grid.cols === perRow &&
        grid.perRow.every((n) => n === perRow) &&
        new Set(grid.widths).size === 1,
      JSON.stringify(grid),
    );
    check(
      `${width}px: every grid row is level (${JSON.stringify(grid.rowHeights)})`,
      grid.rowHeights.every((row) => new Set(row).size === 1),
      JSON.stringify(grid.rowHeights),
    );
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

  // ── 4. request hygiene ───────────────────────────────────────────────────
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
