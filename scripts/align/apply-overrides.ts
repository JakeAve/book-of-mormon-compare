// Applies per-adapter overrides to the aligned results. Each override
// specifies a source line (and optionally a subset of its words) and the
// canonical verse to reassign them to. Used for cases the general algorithm
// can't handle — e.g. source-specific filler phrases that don't appear in
// either neighboring canonical verse, so no structural rule can decide where
// they belong. Keep overrides sparse; the algorithm should handle patterns,
// not enumerate individual edge cases.

import type { Override } from "./sources/types.ts";
import type { CursorResult } from "./types.ts";

export function applyOverrides(
  results: CursorResult[],
  overrides: Override[] | undefined,
): CursorResult[] {
  if (!overrides || overrides.length === 0) return results;

  const out = results.slice();
  for (const ov of overrides) {
    const inRange = matchPredicate(ov);
    let matched = 0;
    for (let i = 0; i < out.length; i++) {
      const r = out[i];
      if (r.page !== ov.page || r.line !== ov.line) continue;
      if (!inRange(r.wordIndexInLine)) continue;
      out[i] = {
        ...r,
        assignedVerse: {
          book: ov.target.book,
          chapter: ov.target.chapter,
          verse: ov.target.verse,
        },
      };
      matched++;
    }
    if (matched === 0) {
      console.warn(
        `  override did not match any source words: page=${ov.page} line=${ov.line} ` +
          `(${ov.note})`,
      );
    }
  }
  return out;
}

function matchPredicate(ov: Override): (idx: number) => boolean {
  if (ov.wordIndices !== undefined) {
    const set = new Set(ov.wordIndices);
    return (idx) => set.has(idx);
  }
  if (ov.wordRange !== undefined) {
    const [lo, hi] = ov.wordRange;
    return (idx) => idx >= lo && idx <= hi;
  }
  return () => true;
}
