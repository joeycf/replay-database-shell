import { readFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';

/**
 * Local production-topology simulator: serves the SHELL's built output behind
 * a faithful implementation of this repo's vercel.json routing phases —
 *
 *   1. redirects (308, query passthrough) — evaluated BEFORE the filesystem
 *   2. shell filesystem (.vercel/output/static)
 *   3. rewrites — proxied to the two GAME builds' static outputs (served on
 *      their own local ports, standing in for the production aliases)
 *   4. the shell's designed 404.html
 *
 * Usage:  node scripts/simulate-topology.mjs
 * Prints the front origin, then serves until killed. Point
 * scripts/verify-cutover.mjs at it to validate the whole cutover locally
 * (redirect map, rewrite prefixes, both games' subpath builds, canonicals)
 * before anything touches Vercel. Vercel's own interpretation of the same
 * rules is re-verified on the preview rehearsal (C.3) and post-cutover (D.4).
 *
 * Matching here covers exactly the rule shapes THIS vercel.json uses
 * (literal sources, `/:path*` suffixes, `has` query keys) — not general
 * Vercel semantics.
 */

const ROOT = new URL('..', import.meta.url).pathname;
const SHELL_DIR = join(ROOT, '.vercel/output/static');
const GAME_DIRS = {
  '2xko-replay-database.vercel.app': join(ROOT, '../2xko-replay-database/.vercel/output/static'),
  'tekken-replay-database.vercel.app': join(
    ROOT,
    '../tekken-replay-database/.vercel/output/static',
  ),
  'sf6-replay-database.vercel.app': join(ROOT, '../sf6-replay-database/.vercel/output/static'),
  'tokon-replay-database.vercel.app': join(ROOT, '../tokon-replay-database/.vercel/output/static'),
};
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
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

/** Static-file resolution à la Vercel: exact file, dir index, .html suffix. */
function readStatic(rootDir, pathname) {
  const path = decodeURIComponent(pathname);
  for (const p of [path, join(path, 'index.html'), `${path}.html`]) {
    try {
      const body = readFileSync(join(rootDir, p));
      const ext = p.slice(p.lastIndexOf('.'));
      return { body, type: MIME[ext] || 'application/octet-stream' };
    } catch {
      /* next candidate */
    }
  }
  return null;
}

/** Match a vercel.json source pattern against a pathname — FAITHFUL to
 *  Vercel's path-to-regexp: `/x/:path*` does NOT match the bare `/x/`
 *  trailing-slash form (empty star + trailing slash = no match; caught on the
 *  preview rehearsal). Slash forms are handled by trailingSlash instead. */
function matchSource(source, pathname) {
  const starIdx = source.indexOf('/:path*');
  if (starIdx === -1) return source === pathname ? {} : null;
  const prefix = source.slice(0, starIdx);
  if (pathname === prefix) return { path: '' };
  if (pathname.startsWith(`${prefix}/`) && pathname.length > prefix.length + 1)
    return { path: pathname.slice(prefix.length + 1) };
  return null;
}

function applyDest(dest, params, search) {
  const url = dest.replace('/:path*', params.path ? `/${params.path}` : '');
  return search ? url + search : url;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const { pathname, search, searchParams } = url;

  // ── phase 0: trailingSlash normalization (vercel.json trailingSlash:false)
  if (CONFIG.trailingSlash === false && pathname !== '/' && pathname.endsWith('/')) {
    res.writeHead(308, { location: pathname.slice(0, -1) + search });
    res.end();
    return;
  }

  // ── phase 1: redirects (before filesystem) ────────────────────────────────
  for (const rule of CONFIG.redirects ?? []) {
    const params = matchSource(rule.source, pathname);
    if (!params) continue;
    if (rule.has && !rule.has.every((h) => h.type === 'query' && searchParams.has(h.key))) continue;
    const location = applyDest(rule.destination, params, search);
    res.writeHead(rule.permanent ? 308 : 307, { location });
    res.end();
    return;
  }

  // ── phase 2: shell filesystem ─────────────────────────────────────────────
  const local = readStatic(SHELL_DIR, pathname);
  if (local) {
    res.writeHead(200, { 'content-type': local.type });
    res.end(local.body);
    return;
  }

  // ── phase 3: rewrites (external → the game builds) ────────────────────────
  for (const rule of CONFIG.rewrites ?? []) {
    const params = matchSource(rule.source, pathname);
    if (!params) continue;
    const destUrl = new URL(applyDest(rule.destination, params, search));
    const gameDir = GAME_DIRS[destUrl.hostname];
    if (!gameDir) continue;
    const upstream = readStatic(gameDir, destUrl.pathname);
    if (upstream) {
      res.writeHead(200, { 'content-type': upstream.type });
      res.end(upstream.body);
    } else {
      // upstream miss → the game's own designed 404 (static root), 404 status
      const nf = readStatic(gameDir, '/404.html');
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(nf ? nf.body : 'not found');
    }
    return;
  }

  // ── phase 4: the shell's designed 404 ─────────────────────────────────────
  const nf = readStatic(SHELL_DIR, '/404.html');
  res.writeHead(404, { 'content-type': 'text/html' });
  res.end(nf ? nf.body : 'not found');
});

const port = process.env.PORT || 0;
server.listen(port, () => {
  console.log(`topology: http://localhost:${server.address().port}`);
  console.log(`  shell  ← ${SHELL_DIR}`);
  for (const [host, dir] of Object.entries(GAME_DIRS)) console.log(`  ${host} ← ${dir}`);
});
