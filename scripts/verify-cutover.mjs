import puppeteer from 'puppeteer-core';

/**
 * The cutover battery (Phase-5 prompt D.4) — run against a LIVE shell host:
 *
 *   node scripts/verify-cutover.mjs                      # https://replaydatabase.com
 *   node scripts/verify-cutover.mjs https://<preview>    # the C.3 rehearsal host
 *
 * Gates:
 *   1. / = the selector, umbrella-themed (#17cfc8), valid ItemList JSON-LD.
 *   2. Every legacy 2XKO apex URL shape 30x → target → 200: /champions/ekko,
 *      a real /players/<id> (sampled from the game sitemap), /stats,
 *      /?fuse=juggernaut (filters!), /?v=<id> (modal opens).
 *   3. /2xko/ + /tekken/ click-through THROUGH the shell host: pages render
 *      real cards, canonicals carry the subpath on the apex origin, computed
 *      --color-primary = #ff2e88 (2XKO) / #e13048 (Tekken) — the Phase-4
 *      theme-presence gate re-applied through the proxy — and /health is 200.
 *   4. /robots.txt points at /sitemap.xml; /sitemap.xml is a sitemap INDEX
 *      listing sitemap-pages.xml + both game sitemaps; each game sitemap's
 *      <loc>s ALL carry the game prefix; no unprefixed game <loc> anywhere.
 *   5. (Phase 6) Every /<slug>/data/summary.json serves 200 JSON THROUGH the
 *      apex with the right identity and a real replay count; the selector's
 *      per-card counts and aggregate line reflect them; and with one summary
 *      blocked, that card degrades gracefully (positive control).
 *
 * Exit non-zero on any failed gate. Chrome per STACK §5.9
 * (/usr/bin/google-chrome-stable, override via CHROME_PATH).
 */

const HOST = (process.argv[2] || 'https://replaydatabase.com').replace(/\/$/, '');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
// The apex the canonicals/sitemaps must point at — build-time absolute URLs,
// fixed regardless of which host serves the page (preview or production).
const APEX = 'https://replaydatabase.com';

/**
 * The games, as the shell's lib/games.ts declares them. Restated here because
 * this is a plain-node script that can't import the TS module — but `id` and
 * `name` are exactly what each game's pipeline hardcodes into its summary.json
 * (scripts/emit.ts), so asserting them below is the cross-repo drift gate for
 * those two constants. `primary` mirrors each game's theme.css.
 */
const GAMES = [
  { slug: '2xko', id: '2xko', name: '2XKO', primary: '#ff2e88', charPath: '/2xko/champions/ekko' },
  // charPath null ⇒ sampled from the game's own sitemap in the loop below
  { slug: 'tekken', id: 'tekken8', name: 'Tekken 8', primary: '#e13048', charPath: null },
  {
    slug: 'sf6',
    id: 'sf6',
    name: 'Street Fighter 6',
    primary: '#ff7d00',
    charPath: '/sf6/characters/ryu',
  },
];

/** Web Analytics proxy prefix per game — each is one rewrite in this repo's
 *  vercel.json AND one `observability.insights` in that game's app.config.ts.
 *  Restated here so gate 6 fails loudly if any of the three drifts. */
const INSIGHTS_PREFIX = (slug) => `/${slug}-insights`;
/** Speed Insights is single-project on Hobby: every game reports to whichever
 *  project owns the apex path, so this one is NOT per-game. */
const SPEED_INSIGHTS_PREFIX = '/_vercel/speed-insights';

/** slug → the live summary payload, filled by the static block, read by the
 *  browser block to check the rendered counts against the real numbers. */
const summaries = {};

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

/** Follow redirects manually, recording every hop. */
async function chain(path, maxHops = 5) {
  const hops = [];
  let url = `${HOST}${path}`;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(url, { redirect: 'manual' });
    const location = res.headers.get('location');
    hops.push({ url, status: res.status, location });
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url).href;
    } else {
      return hops;
    }
  }
  return hops;
}

const fmtChain = (hops) => hops.map((h) => `${h.status} ${h.url.replace(HOST, '')}`).join(' → ');

// ── 1 + 4. plain fetches ─────────────────────────────────────────────────────
console.log(`\nhost: ${HOST}\n\n[static + redirects]`);

{
  const robots = await (await fetch(`${HOST}/robots.txt`)).text();
  check(`/robots.txt advertises the sitemap index`, robots.includes('/sitemap.xml'));

  const index = await (await fetch(`${HOST}/sitemap.xml`)).text();
  check(`/sitemap.xml is a sitemap INDEX`, index.includes('<sitemapindex'));
  for (const s of [
    '/sitemap-pages.xml',
    '/2xko/sitemap.xml',
    '/tekken/sitemap.xml',
    '/sf6/sitemap.xml',
  ]) {
    check(`  index lists ${APEX}${s}`, index.includes(`${APEX}${s}`));
  }

  for (const { slug } of GAMES) {
    const res = await fetch(`${HOST}/${slug}/sitemap.xml`);
    const ok = res.status === 200;
    check(`/${slug}/sitemap.xml serves through the shell (${res.status})`, ok);
    if (ok) {
      const xml = await res.text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const bad = locs.filter((l) => !l.startsWith(`${APEX}/${slug}/`) && l !== `${APEX}/${slug}`);
      check(
        `  every <loc> carries the /${slug} prefix (${locs.length} urls)`,
        locs.length > 0 && bad.length === 0,
        bad.slice(0, 3).join(', '),
      );
    }
  }

  // ── the selector's count source, THROUGH the apex (Phase 6) ─────────────
  // Same-origin is the point: these are the exact URLs the selector fetches
  // client-side, so if the rewrite or the game's build:before copy is missing,
  // it fails here rather than silently omitting a count in the browser.
  console.log('\n[summary.json through the apex]');
  for (const g of GAMES) {
    const path = `/${g.slug}/data/summary.json`;
    const res = await fetch(`${HOST}${path}`);
    if (res.status !== 200) {
      check(`${path} serves 200 (${res.status})`, false);
      continue;
    }
    let payload;
    try {
      payload = JSON.parse(await res.text());
    } catch (e) {
      check(`${path} is valid JSON`, false, e.message);
      continue;
    }
    summaries[g.slug] = payload;
    // `updated` is asserted, not just printed: a build timestamp here would
    // rewrite the file on every zero-new-video day and defeat the game's cron
    // commit guard. It must be a real date and it must not be in the future —
    // the game's own e2e pins it to the newest replay.
    const today = new Date().toISOString().slice(0, 10);
    check(
      `${path}: 200, game=${JSON.stringify(payload.game)}, replays=${payload.replays}, updated=${payload.updated}`,
      payload.game === g.id &&
        payload.name === g.name &&
        typeof payload.replays === 'number' &&
        payload.replays > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(payload.updated ?? '') &&
        payload.updated <= today,
      `expected game=${g.id} name=${g.name} replays>0 updated<=${today}`,
    );
  }

  // legacy 301s → final 200 (the chain is followed hop by hop)
  const legacy = ['/champions/ekko', '/stats', '/?fuse=juggernaut'];
  // a REAL player id sampled from the game sitemap, so the target is a live page
  try {
    const gx = await (await fetch(`${HOST}/2xko/sitemap.xml`)).text();
    const m = gx.match(/<loc>[^<]*\/players\/([^<]+)<\/loc>/);
    if (m) legacy.push(`/players/${m[1]}`);
  } catch {
    /* absence is already covered by the sitemap gate above */
  }
  for (const path of legacy) {
    const hops = await chain(path);
    const first = hops[0];
    const last = hops[hops.length - 1];
    const redirected = first.status >= 300 && first.status < 400;
    check(
      `${path}: ${fmtChain(hops)}`,
      redirected && (first.location || '').includes('/2xko') && last.status === 200,
    );
  }

  // query passthrough on the fuse deep link (filters must survive the 308)
  const fuseHops = await chain('/?fuse=juggernaut');
  const fuseTarget = fuseHops[0]?.location || '';
  check(
    `/?fuse=juggernaut preserves the query in the redirect target (${fuseTarget})`,
    fuseTarget.includes('fuse=juggernaut'),
  );
}

// ── browser gates ────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ── selector ──
  console.log('\n[/ selector]');
  await page.goto(`${HOST}/`, { waitUntil: 'networkidle0' });
  const sel = await page.evaluate(() => ({
    primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    cards: [...document.querySelectorAll('a.game-card')].map((a) => a.getAttribute('href')),
    itemList: (() => {
      try {
        const nodes = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
          (s) => JSON.parse(s.textContent),
        );
        return nodes.find((n) => n['@type'] === 'ItemList')?.itemListElement?.length ?? 0;
      } catch {
        return -1;
      }
    })(),
  }));
  check(`selector wears the umbrella teal (${sel.primary})`, sel.primary === '#17cfc8');
  check(
    `cards link /2xko + /tekken + /sf6`,
    sel.cards.includes('/2xko') && sel.cards.includes('/tekken') && sel.cards.includes('/sf6'),
  );
  check(`ItemList JSON-LD parses with 3 games`, sel.itemList === 3);

  // ── selector counts + aggregate (Phase 6) ──
  // The counts arrive client-side, so they are read from the LIVE page rather
  // than the prerendered HTML — which is exactly where they must not be.
  console.log('\n[/ counts]');
  const num = (s) => Number((s?.match(/[\d,]+/)?.[0] ?? '').replace(/,/g, ''));
  const waitForCounts = (n) =>
    page
      .waitForFunction(
        (expected) =>
          [...document.querySelectorAll('a.game-card .count')].filter((el) => el.textContent.trim())
            .length >= expected,
        { timeout: 15000 },
        n,
      )
      .catch(() => {});
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

  await waitForCounts(GAMES.length);
  const live = await readSelector();
  // A BOUNDED window, not a bare ≥: the lower edge tolerates a cron landing
  // between the fetch above and this page load, the upper edge is what stops a
  // card that renders the wrong game's count — or the archive total — from
  // passing. A single daily refresh moves a game by well under 10%.
  const within = (shown, fetched) => fetched > 0 && shown >= fetched && shown < fetched * 1.1;
  for (const g of GAMES) {
    const fetched = summaries[g.slug]?.replays ?? 0;
    check(
      `/${g.slug} card renders ITS OWN count (${JSON.stringify(live.cards[`/${g.slug}`]?.count)}, fetched ${fetched})`,
      within(num(live.cards[`/${g.slug}`]?.count), fetched),
    );
  }
  const liveTotal = GAMES.reduce((sum, g) => sum + (summaries[g.slug]?.replays ?? 0), 0);
  check(
    `aggregate line totals the archive (${JSON.stringify(live.aggregate)} ≈ ${liveTotal})`,
    within(num(live.aggregate), liveTotal) && live.aggregate.includes('replays across 3 games'),
  );

  // ── POSITIVE CONTROL: block summaries through the browser ──
  // Proves the graceful path is real rather than assumed. Two blocked states,
  // because they fail differently:
  //
  //   ONE blocked  — that card omits its count and drops out of the aggregate
  //                  while the other two are untouched.
  //   ALL blocked  — the state every visitor sees on FIRST PAINT (the counts
  //                  are fetched client-side, so the prerendered HTML has
  //                  none). This is where the reserved count line earns its
  //                  keep: the grid row stretches every card to the tallest, so
  //                  losing ONE card's count can't move anything — only losing
  //                  them all can, and that is exactly the first-paint →
  //                  counts-arrive transition a real visitor sees.
  const heightsOf = (s) =>
    `cards ${Object.values(s.cards)
      .map((c) => c.height)
      .join('/')} · pill ${s.pillHeight} · gridTop ${s.gridTop}`;
  const sameLayout = (a, b) =>
    GAMES.every((g) => a.cards[`/${g.slug}`]?.height === b.cards[`/${g.slug}`]?.height) &&
    a.pillHeight === b.pillHeight &&
    a.gridTop === b.gridTop;

  /** Run the selector with `slugs`' summaries aborted at the network layer. */
  const withBlocked = async (slugs) => {
    const paths = new Set(slugs.map((s) => `/${s}/data/summary.json`));
    const block = (req) => {
      if (paths.has(new URL(req.url()).pathname)) req.abort();
      else req.continue();
    };
    await page.setRequestInterception(true);
    page.on('request', block);
    try {
      await page.goto(`${HOST}/`, { waitUntil: 'networkidle0' });
      const expected = GAMES.length - slugs.length;
      if (expected > 0) {
        await waitForCounts(expected);
      } else {
        // waitForCounts(0) is already true before a single fetch has even
        // failed, so the all-blocked pass settles on the requests instead
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});
      }
      return await readSelector();
    } finally {
      page.off('request', block);
      await page.setRequestInterception(false);
    }
  };

  console.log('\n[/ positive control — /sf6/data/summary.json blocked]');
  const BLOCKED = 'sf6';
  const partial = await withBlocked([BLOCKED]);
  check(
    `blocked ${BLOCKED} card omits its count (${JSON.stringify(partial.cards[`/${BLOCKED}`]?.count)})`,
    partial.cards[`/${BLOCKED}`]?.count === '',
  );
  for (const g of GAMES.filter((g) => g.slug !== BLOCKED)) {
    check(
      `/${g.slug} card unaffected by the block (${JSON.stringify(partial.cards[`/${g.slug}`]?.count)})`,
      within(num(partial.cards[`/${g.slug}`]?.count), summaries[g.slug]?.replays ?? 0),
    );
  }
  const remaining = GAMES.filter((g) => g.slug !== BLOCKED).reduce(
    (sum, g) => sum + (summaries[g.slug]?.replays ?? 0),
    0,
  );
  check(
    `aggregate sums only the two that resolved (${JSON.stringify(partial.aggregate)} ≈ ${remaining}, < ${liveTotal})`,
    within(num(partial.aggregate), remaining) && num(partial.aggregate) < liveTotal,
  );
  check(
    `layout intact with one blocked (${heightsOf(partial)} vs ${heightsOf(live)})`,
    sameLayout(live, partial),
    JSON.stringify({ served: live, blocked: partial }),
  );

  console.log('\n[/ positive control — every summary blocked (the first-paint state)]');
  const none = await withBlocked(GAMES.map((g) => g.slug));
  check(
    `every card omits its count (${JSON.stringify(Object.values(none.cards).map((c) => c.count))})`,
    Object.values(none.cards).every((c) => c.count === ''),
  );
  check(
    `aggregate falls back to the game count (${JSON.stringify(none.aggregate)})`,
    none.aggregate === '3 games in the archive',
  );
  check(
    `NO layout shift when the counts arrive (${heightsOf(none)} → ${heightsOf(live)})`,
    sameLayout(live, none),
    JSON.stringify({ none, served: live }),
  );

  // ── the same transition at PHONE widths ──
  // 1280px is where the check above is blind: the hero pill fits on one line
  // either way there, so a reflow only shows up narrow. These are the widths
  // where the fallback string and the upgraded string differ in line count.
  console.log('\n[/ no layout shift at phone widths]');
  for (const width of [320, 360, 375]) {
    await page.setViewport({ width, height: 900 });
    const blank = await withBlocked(GAMES.map((g) => g.slug));
    await page.goto(`${HOST}/`, { waitUntil: 'networkidle0' });
    await waitForCounts(GAMES.length);
    const filled = await readSelector();
    check(
      `${width}px: grid holds its position (top ${blank.gridTop} → ${filled.gridTop}, pill ${blank.pillHeight} → ${filled.pillHeight})`,
      blank.gridTop === filled.gridTop && blank.pillHeight === filled.pillHeight,
      JSON.stringify({ blank, filled }),
    );
  }
  await page.setViewport({ width: 1280, height: 900 });

  // ── each game through the shell host ──
  for (const g of GAMES) {
    console.log(`\n[/${g.slug}/ through the shell]`);

    // ── 6. observability resolves THROUGH the apex ──
    // The gate that did not exist when the cutover killed analytics for ~10
    // days. Vercel bakes a per-project obfuscated path into each build
    // ("/41a6d9d2116e7933/script.js"); proxied onto the apex it 404s, so both
    // SDKs died silently and every dashboard read zero. Only a load through
    // THIS host can prove the endpoints resolve — the game's own e2e sees a
    // static dir where nothing resolves.
    //
    // No analytics pollution: the insights script no-ops when
    // navigator.webdriver is set, so the script LOADS (which is what broke and
    // what is asserted) but the beacon never fires. Safe against production.
    const observability = [];
    const onObservability = (res) => {
      const p = new URL(res.url()).pathname;
      if (/insights|vitals/.test(p)) observability.push({ p, status: res.status() });
    };
    page.on('response', onObservability);

    await page.goto(`${HOST}/${g.slug}/`, { waitUntil: 'networkidle0' });
    // both SDKs attach on idle, after networkidle0 has already resolved
    await new Promise((r) => setTimeout(r, 4000));
    page.off('response', onObservability);

    const broken = observability.filter((o) => o.status >= 400);
    check(
      `no failed analytics/vitals request (${observability.length} seen)`,
      observability.length > 0 && broken.length === 0,
      observability.length === 0
        ? 'no insights request at all — the SDKs did not attach'
        : broken.map((b) => `${b.status} ${b.p}`).join(', '),
    );
    check(
      `insights script resolves under ${INSIGHTS_PREFIX(g.slug)} (own project)`,
      observability.some((o) => o.p.startsWith(`${INSIGHTS_PREFIX(g.slug)}/`) && o.status < 400),
      observability.map((o) => `${o.status} ${o.p}`).join(', '),
    );
    check(
      `vitals script resolves under ${SPEED_INSIGHTS_PREFIX} (shell project)`,
      observability.some((o) => o.p.startsWith(`${SPEED_INSIGHTS_PREFIX}/`) && o.status < 400),
      observability.map((o) => `${o.status} ${o.p}`).join(', '),
    );
    // THE REGRESSION ITSELF: a 16-hex baked path means the explicit endpoints
    // stopped beating VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG.
    const baked = observability.filter((o) => /^\/[0-9a-f]{16}\//.test(o.p));
    check(
      `no baked per-project hash path`,
      baked.length === 0,
      baked.map((b) => b.p).join(', '),
    );

    const home = await page.evaluate(() => ({
      primary: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary')
        .trim(),
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
      thumbs: document.querySelectorAll('img[src*="ytimg.com"]').length,
    }));
    check(
      `computed --color-primary = ${g.primary} through the shell (got ${home.primary})`,
      home.primary === g.primary,
    );
    check(
      `canonical carries the subpath on the apex (${home.canonical})`,
      // ufo's withBase trims the trailing slash: the engine emits …/tekken
      [`${APEX}/${g.slug}`, `${APEX}/${g.slug}/`].includes(home.canonical),
    );
    check(`browse renders real replay cards (${home.thumbs} thumbs)`, home.thumbs > 0);

    // a character page canonical (2XKO: the known champion; Tekken: sampled)
    let charPath = g.charPath;
    if (!charPath) {
      const xml = await (await fetch(`${HOST}/${g.slug}/sitemap.xml`)).text();
      // Interpolate the slug: this lives inside the per-game loop, so a
      // hardcoded /tekken/ here silently sampled a TEKKEN url for any other
      // game entered with charPath: null.
      const m = xml.match(
        new RegExp(`<loc>https://replaydatabase\\.com(/${g.slug}/characters/[^<]+)</loc>`),
      );
      charPath = m?.[1] ?? null;
    }
    if (charPath) {
      await page.goto(`${HOST}${charPath}`, { waitUntil: 'networkidle0' });
      const cp = await page.evaluate(() => ({
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      }));
      check(
        `${charPath} canonical + real h1 (canonical=${cp.canonical}, h1=${JSON.stringify(cp.h1)})`,
        cp.canonical === `${APEX}${charPath}` && cp.h1.length > 0,
      );
    } else {
      check(`character page found in /${g.slug}/sitemap.xml`, false);
    }

    // /health through the shell
    const health = await page.goto(`${HOST}/${g.slug}/health`, { waitUntil: 'networkidle0' });
    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
    check(
      `/${g.slug}/health responds 200 (${health.status()}) with h1=Health`,
      health.status() === 200 && h1 === 'Health',
    );
  }

  // ── the modal deep link (legacy /?v= → /2xko/?v= → modal opens) ──
  console.log('\n[modal deep link]');
  // Tolerate a host that doesn't serve /2xko at all: pointed at a single game's
  // own *.vercel.app alias (the pre-cutover smoke check), this 404s and returns
  // the game's designed 404 HTML. Parsing that as JSON used to throw and kill
  // the whole run after the useful checks had already passed.
  const vid = await page.evaluate(async () => {
    try {
      const r = await fetch('/2xko/data/replays.json');
      if (!r.ok) return null;
      const replays = await r.json();
      return replays[0]?.id ?? null;
    } catch {
      return null;
    }
  });
  if (vid) {
    await page.goto(`${HOST}/?v=${vid}`, { waitUntil: 'networkidle0' });
    const modal = await page.evaluate(() => ({
      path: location.pathname,
      open: !!document.querySelector('[role="dialog"][aria-modal="true"]'),
    }));
    check(
      `/?v=${vid} lands on /2xko/ with the modal open (path=${modal.path})`,
      modal.path.startsWith('/2xko') && modal.open,
    );
  } else {
    check(`sample replay id from /2xko/data/replays.json`, false);
  }
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
