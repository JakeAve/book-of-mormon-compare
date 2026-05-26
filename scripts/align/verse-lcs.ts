// Aligns one canonical verse against a small window of source words using
// suffix-LCS forward backtracking. Each canonical word is matched to the
// EARLIEST valid source position; the last matched source position is the
// verse boundary.
//
// Per-verse granularity (rather than per-chapter) keeps the window small enough
// that the next verse's vocabulary doesn't bleed into the LCS, and any drift
// is bounded to a single verse before the next iteration recovers.
//
// O(m*n) where m ≤ window size, n = verse word count (typically 20-30).

import type { Matcher } from "./match.ts";
import type { SourceWord, TargetWord } from "./types.ts";

export interface VerseLCSResult {
  /** canon-word index per source word (-1 = unmatched, filled by fillGaps) */
  assignments: Int32Array;
  /** Last source position matched to any canonical word in this verse. */
  lastMatchedSrc: number;
  /** Number of canonical words actually matched (0..n). Used by the cursor to
   *  decide whether to trust lastMatchedSrc directly or apply the consume cap. */
  matchedCount: number;
}

export function verseLCS(
  window: SourceWord[],
  canonWords: TargetWord[],
  matcher: Matcher,
): VerseLCSResult {
  const m = window.length;
  const n = canonWords.length;
  const assignments = new Int32Array(m).fill(-1);
  if (m === 0 || n === 0) {
    return { assignments, lastMatchedSrc: -1, matchedCount: 0 };
  }

  // Suffix LCS table: ds[i][j] = LCS length for source[i..m-1] vs canonical[j..n-1].
  const ds: Uint16Array[] = Array.from(
    { length: m + 1 },
    () => new Uint16Array(n + 1),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      ds[i][j] = matcher.matches(window[i].norm, canonWords[j].norm)
        ? ds[i + 1][j + 1] + 1
        : Math.max(ds[i + 1][j], ds[i][j + 1]);
    }
  }

  // Forward backtracking: match each canonical word at its earliest valid position.
  let fi = 0, fj = 0;
  let lastMatchedSrc = -1;
  let matchedCount = 0;
  while (fi < m && fj < n) {
    if (
      matcher.matches(window[fi].norm, canonWords[fj].norm) &&
      ds[fi][fj] === ds[fi + 1][fj + 1] + 1
    ) {
      assignments[fi] = fj;
      lastMatchedSrc = fi;
      matchedCount++;
      fi++;
      fj++;
    } else if (ds[fi + 1][fj] >= ds[fi][fj + 1]) {
      fi++;
    } else {
      fj++;
    }
  }
  return { assignments, lastMatchedSrc, matchedCount };
}

/**
 * Drop spurious trailing LCS matches that extend past the natural verse
 * boundary into the next verse's source. This happens when the source has
 * dropped clauses (e.g. 1830) — the LCS still tries to match canonical words
 * and finds common ones (`and`, `the`, `it`) in the next verse's territory.
 *
 * Heuristic: in the back half of matches, find the first gap between two
 * consecutive matched source positions that exceeds `maxGap`. Treat that
 * gap as the spurious boundary and drop everything past it. Mutates
 * `assignments` in place. Returns the new lastMatchedSrc.
 */
export function trimTrailingSparseMatches(
  assignments: Int32Array,
  lastMatchedSrc: number,
  maxGap: number,
): number {
  const matched: number[] = [];
  for (let i = 0; i <= lastMatchedSrc; i++) {
    if (assignments[i] !== -1) matched.push(i);
  }
  if (matched.length < 3) return lastMatchedSrc;
  const midpoint = Math.floor(matched.length / 2);
  for (let i = midpoint; i < matched.length; i++) {
    const gap = matched[i] - matched[i - 1];
    if (gap > maxGap) {
      for (let j = matched[i]; j < assignments.length; j++) {
        assignments[j] = -1;
      }
      return matched[i - 1];
    }
  }
  return lastMatchedSrc;
}

/**
 * In-place: forward-fill -1s with the most recent matched canonical index,
 * back-fill leading -1s with the first real assignment, and clamp to [0,maxIdx].
 */
export function fillGapsInPlace(a: Int32Array, maxIdx: number): void {
  let cur = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== -1) cur = a[i];
    else if (cur >= 0) a[i] = cur;
  }
  let first = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== -1) {
      first = a[i];
      break;
    }
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] === -1) a[i] = first;
    else break;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] > maxIdx) a[i] = maxIdx;
    if (a[i] < 0) a[i] = 0;
  }
}
