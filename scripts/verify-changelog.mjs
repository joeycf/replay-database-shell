import { CHANGELOG } from '../lib/changelog.ts';

/**
 * Schema gate for lib/changelog.ts — the shell's only hand-curated table with a
 * validator, and the reason `npm run typecheck` ends in this script.
 *
 * WHY IT EXISTS. The changelog is prerendered into static HTML, so a malformed
 * row does not fail a build or throw in a browser — it just ships. A date typo
 * files an entry under the wrong month heading; an unknown scope renders a
 * badge with no accent; a row inserted in the wrong place puts the platform's
 * history out of order on the one page whose entire job is chronology. Every
 * rule below exits rather than warns, per the game repos' posture: a bad row is
 * wrong in public, and nothing else is watching for it.
 *
 * The import above is why lib/changelog.ts may never import anything: Node
 * strips the types but does NOT resolve extensionless relative specifiers, so a
 * single `import './site'` in that file would make this gate un-runnable — the
 * failure mode the engine calls "a gate that cannot run is worse than no gate".
 */

const SCOPES = ['platform', 'engine', 'shell', '2xko', 'tekken', 'sf6', 'tokon'];
const KINDS = ['launch', 'feature', 'data', 'improvement'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const TITLE_MAX = 60;
const BODY_MAX_SENTENCES = 4;

/** Today in the site's own terms. Entries describe what already shipped. */
const today = new Date().toISOString().slice(0, 10);

const errors = [];
const at = (i, entry) => `#${i + 1} (${entry?.date ?? '?'} ${entry?.title ?? '?'})`;

if (!Array.isArray(CHANGELOG) || CHANGELOG.length === 0) {
  errors.push('CHANGELOG is empty or not an array');
}

CHANGELOG.forEach((e, i) => {
  if (!ISO_DAY.test(e.date ?? '')) {
    errors.push(`${at(i, e)}: date "${e.date}" is not YYYY-MM-DD`);
  } else if (Number.isNaN(Date.parse(e.date))) {
    errors.push(`${at(i, e)}: date "${e.date}" is not a real calendar day`);
  } else if (e.date > today) {
    errors.push(`${at(i, e)}: date "${e.date}" is in the future (today is ${today})`);
  }

  if (!SCOPES.includes(e.scope)) {
    errors.push(`${at(i, e)}: scope "${e.scope}" is not one of ${SCOPES.join(' | ')}`);
  }
  if (!KINDS.includes(e.kind)) {
    errors.push(`${at(i, e)}: kind "${e.kind}" is not one of ${KINDS.join(' | ')}`);
  }

  if (typeof e.title !== 'string' || e.title.trim() === '') {
    errors.push(`${at(i, e)}: title is empty`);
  } else if (e.title.length > TITLE_MAX) {
    errors.push(`${at(i, e)}: title is ${e.title.length} chars, over the ${TITLE_MAX} limit`);
  }

  if (typeof e.body !== 'string' || e.body.trim() === '') {
    errors.push(`${at(i, e)}: body is empty`);
  } else {
    // Sentence count is the editorial rule made mechanical: 1–4, where a
    // sentence ends in . ! or ? followed by end-of-string or a space. Decimal
    // points inside numbers ("31 MB", "98.75%") do not match — the digit after
    // the dot is neither a space nor the end.
    const sentences = (e.body.match(/[.!?](\s|$)/g) ?? []).length;
    if (sentences === 0) {
      errors.push(`${at(i, e)}: body has no sentence-ending punctuation`);
    } else if (sentences > BODY_MAX_SENTENCES) {
      errors.push(
        `${at(i, e)}: body is ${sentences} sentences, over the ${BODY_MAX_SENTENCES} limit`,
      );
    }
  }

  if (e.href !== undefined && !/^(https?:\/\/|\/)/.test(e.href)) {
    errors.push(`${at(i, e)}: href "${e.href}" must be absolute or root-relative`);
  }

  // Reverse-chronological, NON-INCREASING: equal dates are legitimate (two
  // things shipped the same day) and are ordered by hand. Strictly decreasing
  // would reject the four same-day pairs this table already carries.
  if (i > 0) {
    const prev = CHANGELOG[i - 1];
    if (ISO_DAY.test(prev.date ?? '') && ISO_DAY.test(e.date ?? '') && e.date > prev.date) {
      errors.push(
        `${at(i, e)}: out of order — ${e.date} is newer than the entry above it (${prev.date})`,
      );
    }
  }
});

if (errors.length > 0) {
  console.error(`✖ ${errors.length} error(s) in the changelog:`);
  for (const err of errors) console.error(`  • ${err}`);
  process.exit(1);
}

const oldest = CHANGELOG[CHANGELOG.length - 1].date;
const newest = CHANGELOG[0].date;
const scopes = new Set(CHANGELOG.map((e) => e.scope));
console.log(
  `✓ ${CHANGELOG.length} entries, ${oldest} → ${newest} — ` +
    `${scopes.size} scopes, ${new Set(CHANGELOG.map((e) => e.date.slice(0, 7))).size} months`,
);
