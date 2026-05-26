// Anchor detection for sparse / fragmentary sources (OM).
//
// Problem: the cursor walks canonical verses sequentially, but OM is ~28%
// complete and its surviving pages jump around canon. A linear walk from
// canonical verse 0 mis-aligns OM source against canonical verses it has
// nothing to say about.
//
// Solution: before processing a segment, look at the segment's first N source
// words and find the canonical verse-group index where they match best in
// SEQUENCE (LCS length). Jump the cursor there. Bag-of-words scoring gets
// fooled by similar phrases scattered through canon ("he should take his
// family into the wilderness" appears in both 1-ne 2:2 and 1-ne 7:1); LCS
// rewards consecutive ordered matches.
//
// The search is constrained to [minIdx, maxIdx) so the cursor never moves
// backward and never crosses into the next book-heading-segment's territory.

import type { Matcher } from "./match.ts";
import type { SourceWord } from "./types.ts";
import type { VerseGroup } from "./tokenize-target.ts";

/**
 * Find the verse-group index whose words have the longest LCS with the
 * source window. Lookahead combines adjacent verseGroups so an anchor on a
 * sub-verse-length source window can still match.
 *
 * Ties broken by lower j (prefer earliest position).
 */
export function findAnchor(
  sourceWindow: SourceWord[],
  verseGroups: VerseGroup[],
  minIdx: number,
  maxIdx: number,
  matcher: Matcher,
  lookaheadVerses: number,
): number {
  if (sourceWindow.length === 0 || minIdx >= maxIdx) return minIdx;

  let bestIdx = minIdx;
  let bestScore = -1;

  for (let j = minIdx; j < maxIdx; j++) {
    const end = Math.min(j + Math.max(1, lookaheadVerses), maxIdx);
    // Flatten candidate canonical words for this window.
    const canonWords: string[] = [];
    for (let k = j; k < end; k++) {
      for (const w of verseGroups[k].words) canonWords.push(w.norm);
    }
    const score = lcsLength(sourceWindow, canonWords, matcher);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = j;
    }
  }
  return bestIdx;
}

/** Standard LCS length between source-word.norm and a flat canonical-word
 *  string array, using the matcher's fuzzy match. Quadratic in
 *  source.length × canonical.length but the windows are small (~30 × ~75). */
function lcsLength(
  source: SourceWord[],
  canon: string[],
  matcher: Matcher,
): number {
  const m = source.length;
  const n = canon.length;
  if (m === 0 || n === 0) return 0;
  const prev = new Uint16Array(n + 1);
  const curr = new Uint16Array(n + 1);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = matcher.matches(source[i - 1].norm, canon[j - 1])
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1]);
    }
    prev.set(curr);
  }
  return prev[n];
}
