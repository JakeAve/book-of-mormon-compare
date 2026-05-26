// Alignment for sparse / fragmentary sources via n-gram anchor scaffold.
//
// The cursor in cursor.ts assumes every canonical verse maps to some source
// content (true for PM/1830/1837 which cover ~100% of canon). OM covers only
// ~28% and its surviving pages jump around, so the linear cursor smears OM
// source across all canonical verses it walks past.
//
// This module aligns differently: build a global anchor scaffold from unique
// n-grams shared between source and target, interpolate to map each source
// token to a target token index, then look up which canonical verse owns that
// target index. Source words assigned to a canonical verse no real OM source
// covers simply never get assigned — those verses are omitted from output.

import { buildAnchorsMulti, interpolateScaffold } from "./ngram-anchor.ts";
import { mergeLineBreakSplits } from "./merge-splits.ts";
import { verseKey } from "./line-key.ts";
import { createMatcher, type Matcher } from "./match.ts";
import type { CursorResult, LineInfo, SourceWord } from "./types.ts";
import type { VerseGroup } from "./tokenize-target.ts";

export interface ScaffoldConfig {
  /** N-gram sizes to layer (largest-first). Default [6, 4, 3]. */
  ngrams: number[];
  /** Minimum number of source tokens that must map to a canonical verse for
   *  it to be emitted. Filters out verses where interpolation drift assigns
   *  one or two source words to a canonical verse OM doesn't actually cover. */
  minTokensPerVerse: number;
}

export const DEFAULT_SCAFFOLD_CONFIG: ScaffoldConfig = {
  ngrams: [6, 4, 3],
  minTokensPerVerse: 3,
};

export function runScaffoldAlign(
  source: SourceWord[],
  verseGroups: VerseGroup[],
  _lineInfos: Map<string, LineInfo>,
  config: ScaffoldConfig = DEFAULT_SCAFFOLD_CONFIG,
): CursorResult[] {
  if (source.length === 0 || verseGroups.length === 0) return [];

  // Pre-merge line-break splits like the cursor does — so "wher"+"efore" can
  // contribute n-gram matches and end up correctly placed.
  const allCanonNorms = new Set(
    verseGroups.flatMap((vg) => vg.words.map((w) => w.norm)),
  );
  const { words: mergedSource, spanOf } = mergeLineBreakSplits(
    source,
    allCanonNorms,
  );

  // Flatten target tokens + remember which verseGroup each one belongs to.
  const targetTokens: { norm: string }[] = [];
  const targetVgIdx: number[] = []; // target token idx → verseGroup idx
  for (let vi = 0; vi < verseGroups.length; vi++) {
    for (const w of verseGroups[vi].words) {
      targetTokens.push({ norm: w.norm });
      targetVgIdx.push(vi);
    }
  }

  // Build the anchor scaffold and interpolate source idx → target idx.
  const anchors = buildAnchorsMulti(mergedSource, targetTokens, config.ngrams);
  const sToT = interpolateScaffold(
    anchors,
    mergedSource.length,
    targetTokens.length,
  );

  // First pass: per-source-word, what verseGroup does interpolation place it in?
  const mergedVgPerSource = new Int32Array(mergedSource.length);
  const tokensPerVg = new Map<number, number>();
  for (let i = 0; i < mergedSource.length; i++) {
    const vg = targetVgIdx[sToT[i]];
    mergedVgPerSource[i] = vg;
    tokensPerVg.set(vg, (tokensPerVg.get(vg) ?? 0) + 1);
  }

  // Second pass: assign each source word to its verseGroup, but DROP verses
  // that received fewer than minTokensPerVerse — those are interpolation
  // artifacts (one or two stray tokens flagging a verse OM doesn't cover).
  // Source words whose target verse is dropped get fused with the nearest
  // KEPT neighbor's verse, in source order. If no neighbor is kept (edges),
  // the word is silently omitted from output by leaving its assignment unset
  // and relying on the trailing-fill below.
  const mergedResult: (CursorResult | undefined)[] = new Array(
    mergedSource.length,
  );
  let lastKeptVg = -1;
  for (let i = 0; i < mergedSource.length; i++) {
    let vg = mergedVgPerSource[i];
    if ((tokensPerVg.get(vg) ?? 0) < config.minTokensPerVerse) {
      // Look ahead for the next kept verseGroup.
      let next = -1;
      for (let j = i + 1; j < mergedSource.length; j++) {
        const v2 = mergedVgPerSource[j];
        if ((tokensPerVg.get(v2) ?? 0) >= config.minTokensPerVerse) {
          next = v2;
          break;
        }
      }
      // Prefer the closer of (lastKeptVg, next). For ties / edges, prefer
      // the side that exists.
      if (lastKeptVg < 0 && next < 0) continue; // no anchor either side
      else if (lastKeptVg < 0) vg = next;
      else if (next < 0) vg = lastKeptVg;
      else {
        const dPrev = vg - lastKeptVg;
        const dNext = next - vg;
        vg = Math.abs(dPrev) <= Math.abs(dNext) ? lastKeptVg : next;
      }
    } else {
      lastKeptVg = vg;
    }
    const target = verseGroups[vg];
    mergedResult[i] = {
      ...mergedSource[i],
      assignedVerse: {
        book: target.book,
        chapter: target.chapter,
        verse: target.verse,
      },
    };
  }

  // Boundary refinement: piecewise-linear interpolation can round to the wrong
  // side at a verse boundary. When the LAST source word of a run assigned to
  // verse V matches verse V+1's HEAD better than verse V's TAIL, nudge it
  // forward. Example: OM line "...father and it came to pass..." straddles
  // canonical 8:35 (ending "...my father.") and 8:36 (starting "And it came
  // to pass..."). The "and" interpolates near the boundary and gets stuck in
  // 8:35; the refinement reassigns it to 8:36 because "and" appears at the
  // head of 8:36's canonical text but not in 8:35's tail.
  refineBoundaries(mergedResult, mergedSource, verseGroups, createMatcher());

  // Trailing-fill any unassigned merged-source slots with the last known verse.
  let lastAssigned: CursorResult["assignedVerse"] | null = null;
  for (let i = 0; i < mergedSource.length; i++) {
    if (mergedResult[i]) {
      lastAssigned = mergedResult[i]!.assignedVerse;
    } else if (lastAssigned) {
      mergedResult[i] = { ...mergedSource[i], assignedVerse: lastAssigned };
    }
  }
  // Back-fill leading unassigned slots from the first assigned one.
  let firstAssigned: CursorResult["assignedVerse"] | null = null;
  for (let i = 0; i < mergedSource.length; i++) {
    if (mergedResult[i]) {
      firstAssigned = mergedResult[i]!.assignedVerse;
      break;
    }
  }
  if (firstAssigned) {
    for (let i = 0; i < mergedSource.length; i++) {
      if (!mergedResult[i]) {
        mergedResult[i] = { ...mergedSource[i], assignedVerse: firstAssigned };
      }
    }
  }

  // Expand merged tokens back to original source positions.
  const result: CursorResult[] = new Array(source.length);
  let origIdx = 0;
  for (let mi = 0; mi < mergedSource.length; mi++) {
    const span = spanOf[mi];
    const av = mergedResult[mi]?.assignedVerse;
    for (let s = 0; s < span; s++) {
      if (av) {
        result[origIdx] = { ...source[origIdx], assignedVerse: av };
      }
      origIdx++;
    }
  }
  // Drop unassigned originals (entire source has zero anchors — degenerate).
  return result.filter((r) => r !== undefined);
}

const BOUNDARY_LOOK = 5;
const BOUNDARY_MAX_CONCAT = 4;

/**
 * Walk source-position runs (consecutive positions assigned to the same
 * verse). At each transition V → V', try two refinements:
 *
 *   1. SINGLE-WORD: if the LAST source word of V's run appears in V'.HEAD
 *      but NOT in V.TAIL, reassign it to V'. Fixes interpolation tie-breaks
 *      like "father AND it came" → boundary at "and" rounded the wrong way.
 *
 *   2. MULTI-WORD CONCAT: if the single-word check doesn't fire, try
 *      concatenating the last K source words (K up to BOUNDARY_MAX_CONCAT)
 *      and see if the concat matches a canonical word in V'.HEAD. Catches
 *      scribal multi-token spellings: OM writes "Nevertheless" as
 *      `never the less` — three separate words; the concat `neverthelesss`
 *      matches canonical `nevertheless` (via fuzzy match for the doubled-s).
 *      When fired, all K boundary words migrate to V'.
 *
 * Mutates `mergedResult` in place.
 */
function refineBoundaries(
  mergedResult: (CursorResult | undefined)[],
  mergedSource: SourceWord[],
  verseGroups: VerseGroup[],
  matcher: Matcher,
): void {
  // Build a verseKey → verseGroup-idx map for O(1) lookups.
  const vgIdxByKey = new Map<string, number>();
  for (let i = 0; i < verseGroups.length; i++) {
    const vg = verseGroups[i];
    vgIdxByKey.set(verseKey(vg.book, vg.chapter, vg.verse), i);
  }

  for (let i = 0; i + 1 < mergedResult.length; i++) {
    const a = mergedResult[i];
    const b = mergedResult[i + 1];
    if (!a || !b) continue;
    const aKey = verseKey(
      a.assignedVerse.book,
      a.assignedVerse.chapter,
      a.assignedVerse.verse,
    );
    const bKey = verseKey(
      b.assignedVerse.book,
      b.assignedVerse.chapter,
      b.assignedVerse.verse,
    );
    if (aKey === bKey) continue;
    const aIdx = vgIdxByKey.get(aKey);
    const bIdx = vgIdxByKey.get(bKey);
    if (aIdx === undefined || bIdx === undefined) continue;
    // Only refine ADJACENT verses (don't pull across large jumps).
    if (bIdx - aIdx !== 1) continue;

    const aTail = verseGroups[aIdx].words.slice(-BOUNDARY_LOOK).map((w) =>
      w.norm
    );
    const bHead = verseGroups[bIdx].words.slice(0, BOUNDARY_LOOK).map((w) =>
      w.norm
    );

    // 1. Single-word check. Use the matcher (not exact `includes`) so
    // scribal variants like `wherefor` vs `wherefore` count as a match.
    const w = mergedSource[i].norm;
    const inTail = aTail.some((t) => matcher.matches(w, t));
    const inHead = bHead.some((h) => matcher.matches(w, h));
    if (!inTail && inHead) {
      mergedResult[i] = {
        ...mergedSource[i],
        assignedVerse: b.assignedVerse,
      };
      continue;
    }
    if (inTail) continue; // boundary word legitimately belongs to V

    // 2. Multi-word concat check. The scribe may have spelled a single
    // canonical word as several source tokens. The split can straddle the
    // boundary; the canonical word may live in V'.HEAD or in V.TAIL:
    //   - V'.HEAD case (OM `never the less` → `nevertheless`): migrate the
    //     L V-side tokens forward to V'.
    //   - V.TAIL case (OM `an other` → `another`): migrate the R V'-side
    //     tokens backward to V.
    let fired = false;
    for (let total = 2; total <= BOUNDARY_MAX_CONCAT && !fired; total++) {
      for (let L = 1; L < total && !fired; L++) {
        const R = total - L;
        const s = i - L + 1;
        const e = i + R;
        if (s < 0 || e >= mergedResult.length) continue;
        // All s..i must be in V's run; all i+1..e must be in V''s run.
        let ok = true;
        for (let j = s; j <= i; j++) {
          const m = mergedResult[j];
          if (!m || !sameVerse(m.assignedVerse, a.assignedVerse)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        for (let j = i + 1; j <= e; j++) {
          const m = mergedResult[j];
          if (!m || !sameVerse(m.assignedVerse, b.assignedVerse)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        let concat = "";
        for (let j = s; j <= e; j++) concat += mergedSource[j].norm;

        const matchesHead = bHead.some((h) => matcher.matches(concat, h));
        const matchesTail = aTail.some((t) => matcher.matches(concat, t));

        if (matchesHead) {
          // Guard: none of the L V-side tokens should appear in V.TAIL alone
          // (otherwise we'd peel legitimate V content into V').
          let anyInTail = false;
          for (let j = s; j <= i; j++) {
            const sw = mergedSource[j].norm;
            if (aTail.some((t) => matcher.matches(sw, t))) {
              anyInTail = true;
              break;
            }
          }
          if (anyInTail) continue;

          for (let j = s; j <= i; j++) {
            mergedResult[j] = {
              ...mergedSource[j],
              assignedVerse: b.assignedVerse,
            };
          }
          fired = true;
        } else if (matchesTail) {
          // Symmetric: guard that none of the R V'-side tokens individually
          // belongs to V'.HEAD (otherwise we'd peel legitimate V' content
          // into V).
          let anyInHead = false;
          for (let j = i + 1; j <= e; j++) {
            const sw = mergedSource[j].norm;
            if (bHead.some((h) => matcher.matches(sw, h))) {
              anyInHead = true;
              break;
            }
          }
          if (anyInHead) continue;

          for (let j = i + 1; j <= e; j++) {
            mergedResult[j] = {
              ...mergedSource[j],
              assignedVerse: a.assignedVerse,
            };
          }
          fired = true;
        }
      }
    }
  }
}

function sameVerse(
  a: CursorResult["assignedVerse"],
  b: CursorResult["assignedVerse"],
): boolean {
  return a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;
}
