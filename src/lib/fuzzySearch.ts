import { Product } from '@/types';

// ── Typo-tolerant product matching ────────────────────────────────────────────
//
// Used as a fallback when a plain substring (ILIKE) search returns nothing —
// the common case being a shopper mistyping a product name (e.g. "hamer" for
// "hammer", "scrwe" for "screw"). Runs entirely in JS against an already
// category/price-filtered candidate set, so it only needs to be cheap for the
// couple hundred rows in a single category table, not the whole catalog.

// Optimal string alignment distance: Levenshtein plus adjacent-transposition
// as a single edit, so "scrwe" → "screw" (swapped last two letters) costs 1
// instead of 2 — swapped-letter typos are common enough to matter.
function editDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

// Shorter words tolerate less absolute edit distance, or two- and
// three-letter typos would match almost anything.
function maxDistanceFor(wordLength: number): number {
  if (wordLength <= 3) return 0;
  if (wordLength <= 5) return 1;
  return 2;
}

function normalizeWords(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Lower is a better match; null means the query didn't match at all.
 * Every query word must have some match (substring or within edit-distance)
 * against a word in the target text, so multi-word queries stay precise.
 */
function fuzzyScore(queryWords: string[], targetText: string): number | null {
  // Drop 1-char tokens (unit/size initials like the "c" in "USB A+C" or the
  // "m" in "M-Sand") — otherwise `qw.includes(tw)` trivially matches almost
  // any query, since most words contain some single letter.
  const targetWords = normalizeWords(targetText).filter((w) => w.length >= 2);
  if (targetWords.length === 0) return null;

  let total = 0;
  for (const qw of queryWords) {
    let best = Infinity;
    for (const tw of targetWords) {
      // Containment only counts as a free match for words of similar length
      // (e.g. "pipes" vs "pipe") — otherwise a long query word coincidentally
      // contains an unrelated short target word (e.g. "emultion" contains
      // "multi") and scores a false positive over the real typo match.
      const substringMatch = tw.length >= 3 && qw.length >= 3
        && Math.abs(tw.length - qw.length) <= 2
        && (tw.includes(qw) || qw.includes(tw));
      if (substringMatch) {
        best = 0;
        break;
      }
      const d = editDistance(qw, tw);
      if (d < best) best = d;
    }
    if (best > maxDistanceFor(qw.length)) return null;
    total += best;
  }
  return total;
}

/**
 * Ranks candidates by typo-tolerant closeness to `query` (name + brand),
 * returning at most `limit` matches, best first. Candidates should already
 * be scoped to the relevant category/price range.
 */
export function rankByFuzzyMatch(query: string, candidates: Product[], limit: number): Product[] {
  const queryWords = normalizeWords(query);
  if (queryWords.length === 0) return [];

  const scored = candidates
    .map((product) => ({
      product,
      score: fuzzyScore(queryWords, `${product.brand ?? ''} ${product.name}`),
    }))
    .filter((s): s is { product: Product; score: number } => s.score !== null)
    .sort((a, b) => a.score - b.score);

  return scored.slice(0, limit).map((s) => s.product);
}
