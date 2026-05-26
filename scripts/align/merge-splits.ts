// Manuscript line breaks sometimes fall mid-word. Detect pairs of adjacent
// tokens from different source lines where the combined norm is a canonical
// word (e.g. "wher" + "efore" → "wherefore"). Merge them before the LCS so
// the aligner can match the full word correctly. The caller must expand the
// merged result back to the original source indices after verse assignment.

import type { SourceWord } from "./types.ts";

export interface MergeResult {
  words: SourceWord[];
  /** Maps merged-array index → count of original source words it replaced (1 or 2). */
  spanOf: Uint8Array;
}

export function mergeLineBreakSplits(
  source: SourceWord[],
  canonNorms: Set<string>,
): MergeResult {
  const words: SourceWord[] = [];
  const spans: number[] = [];
  let i = 0;
  while (i < source.length) {
    const w = source[i];
    const next = source[i + 1];
    if (
      next !== undefined &&
      w.line !== next.line &&
      canonNorms.has(w.norm + next.norm) &&
      !canonNorms.has(w.norm)
    ) {
      spans.push(2);
      words.push({ ...w, norm: w.norm + next.norm });
      i += 2;
    } else {
      spans.push(1);
      words.push(w);
      i++;
    }
  }
  return { words, spanOf: Uint8Array.from(spans) };
}
