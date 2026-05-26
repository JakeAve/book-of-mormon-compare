import { createMatcher } from "./match.ts";
import { headingToBook } from "./headings.ts";
import { segmentSource } from "./segment-source.ts";
import { mergeLineBreakSplits } from "./merge-splits.ts";
import { findAnchor } from "./anchor.ts";
import {
  fillGapsInPlace,
  trimTrailingSparseMatches,
  verseLCS,
} from "./verse-lcs.ts";
import { DEFAULT_CURSOR_CONFIG } from "./sources/types.ts";
import type { CursorConfig } from "./sources/types.ts";
import type { CursorResult, LineInfo, SourceWord } from "./types.ts";
import type { VerseGroup } from "./tokenize-target.ts";

export function runCursor(
  source: SourceWord[],
  verseGroups: VerseGroup[],
  lineInfos: Map<string, LineInfo> = new Map(),
  config: CursorConfig = DEFAULT_CURSOR_CONFIG,
  dictionary?: Map<string, string>,
): CursorResult[] {
  if (source.length === 0 || verseGroups.length === 0) return [];

  const matcher = createMatcher(dictionary);

  // Pre-merge line-break splits: "wher" + "efore" → "wherefore".
  const allCanonNorms = new Set(
    verseGroups.flatMap((vg) => vg.words.map((w) => w.norm)),
  );
  const { words: mergedSource, spanOf } = mergeLineBreakSplits(
    source,
    allCanonNorms,
  );

  // Segment source at chapter headings (hard anchors that reset drift).
  const segments = segmentSource(mergedSource, lineInfos);

  // canonical book slug → first index in verseGroups
  const bookStart = new Map<string, number>();
  for (let i = 0; i < verseGroups.length; i++) {
    const b = verseGroups[i].book;
    if (!bookStart.has(b)) bookStart.set(b, i);
  }

  // Expected source words per canonical word. For complete sources we compute
  // the global ratio. For sparse sources (OM) the global ratio understates the
  // LOCAL ratio within covered regions, so the adapter overrides it.
  const totalCanonWords = verseGroups.reduce((s, vg) => s + vg.words.length, 0);
  const srcPerCanon = config.srcPerCanonOverride ??
    (totalCanonWords > 0 ? source.length / totalCanonWords : 1.1);

  // Limit each segment to verse groups before the next book-heading segment.
  const segVgLimits = computeSegmentLimits(
    segments,
    bookStart,
    verseGroups.length,
  );

  const mergedResult: CursorResult[] = new Array(mergedSource.length);
  let vgIdx = 0;

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.words.length === 0) continue;

    // When entering a book-heading segment, jump vgIdx to the matching book
    // (always — even backward — to correct any drift from prior segments).
    if (seg.headingText) {
      const targetBook = headingToBook(seg.headingText);
      if (targetBook !== null) {
        const jumpTo = bookStart.get(targetBook);
        if (jumpTo !== undefined && jumpTo > vgIdx) vgIdx = jumpTo;
      }
    }

    const vgLimit = segVgLimits[si];

    // Anchor search: for fragmentary sources, find which canonical verse-group
    // the segment actually starts at and jump there. Search is bounded above
    // by the next book-heading segment so we don't cross books.
    if (config.anchorWindowWords > 0 && vgIdx < vgLimit) {
      const anchorWindow = seg.words.slice(0, config.anchorWindowWords);
      vgIdx = findAnchor(
        anchorWindow,
        verseGroups,
        vgIdx,
        vgLimit,
        matcher,
        config.anchorLookaheadVerses,
      );
    }

    let srcOffset = 0;

    while (srcOffset < seg.words.length && vgIdx < vgLimit) {
      const vg = verseGroups[vgIdx];
      if (vg.words.length === 0) {
        vgIdx++;
        continue;
      }

      const available = seg.words.slice(srcOffset);
      const windowSize = Math.min(
        available.length,
        Math.max(
          Math.round(vg.words.length * srcPerCanon * config.windowSlack),
          config.windowMin,
        ),
      );
      const window = available.slice(0, windowSize);

      const lcs = verseLCS(window, vg.words, matcher);
      let { lastMatchedSrc } = lcs;
      const { assignments, matchedCount } = lcs;

      // Tail-trim: drop spurious LCS matches that extend past the natural
      // verse boundary into the next verse's source. Only fires for verses
      // with low match coverage — a signal that the source is missing
      // canonical content (e.g. 1830's dropped clauses) and the LCS may have
      // grabbed common words from the next verse's source.
      const matchFraction = matchedCount / vg.words.length;
      if (
        config.tailGapFactor > 0 &&
        matchedCount >= 3 &&
        matchFraction < config.tailTrimMaxMatchFraction
      ) {
        lastMatchedSrc = trimTrailingSparseMatches(
          assignments,
          lastMatchedSrc,
          srcPerCanon * config.tailGapFactor,
        );
      }

      fillGapsInPlace(assignments, vg.words.length - 1);

      const expectedConsume = Math.max(
        Math.round(vg.words.length * srcPerCanon * config.consumeSlack),
        config.consumeMin,
      );

      // If the LCS found no matches AND we're near the end of this segment,
      // don't advance vgIdx — the verse's actual content is likely in the next
      // segment (e.g. a PM chapter heading split the verse across segments).
      const segRemaining = seg.words.length - srcOffset;
      const nearSegmentEnd = segRemaining <= expectedConsume / 2;
      if (lastMatchedSrc < 0 && nearSegmentEnd) break;

      // Sparse-source mode: if the LCS only matched a small fraction of
      // canonical words, the source likely has no real content for this
      // verse (it just matched common words like "and"/"the"). Advance
      // vgIdx without consuming source so the next verse gets a shot at
      // the same window. Used for incomplete manuscripts (OM is ~28%
      // complete and jumps around).
      if (
        config.skipBelowMatchFraction > 0 &&
        matchFraction < config.skipBelowMatchFraction
      ) {
        vgIdx++;
        continue;
      }

      // High-confidence path: when the LCS matched every canonical word
      // (matchFraction >= highMatchFraction), trust lastMatchedSrc directly
      // and skip the consume cap.
      const consumeCount = lastMatchedSrc >= 0
        ? (matchFraction >= config.highMatchFraction
          ? lastMatchedSrc + 1
          : Math.min(lastMatchedSrc + 1, expectedConsume))
        : Math.min(expectedConsume, window.length);

      const srcBase = seg.startIdx + srcOffset;
      for (let k = 0; k < consumeCount; k++) {
        mergedResult[srcBase + k] = {
          ...window[k],
          assignedVerse: {
            book: vg.book,
            chapter: vg.chapter,
            verse: vg.verse,
          },
        };
      }

      srcOffset += consumeCount;
      vgIdx++;
    }
  }

  return expandToOriginalSource(
    source,
    mergedSource,
    mergedResult,
    spanOf,
    verseGroups,
  );
}

function computeSegmentLimits(
  segments: ReturnType<typeof segmentSource>,
  bookStart: Map<string, number>,
  totalGroups: number,
): number[] {
  const limits: number[] = segments.map(() => totalGroups);
  for (let si = 0; si < segments.length; si++) {
    for (let sj = si + 1; sj < segments.length; sj++) {
      if (!segments[sj].headingText) continue;
      const nextBook = headingToBook(segments[sj].headingText);
      if (nextBook !== null) {
        const nextStart = bookStart.get(nextBook);
        if (nextStart !== undefined) {
          limits[si] = nextStart;
          break;
        }
      }
    }
  }
  return limits;
}

function expandToOriginalSource(
  source: SourceWord[],
  mergedSource: SourceWord[],
  mergedResult: CursorResult[],
  spanOf: Uint8Array,
  verseGroups: VerseGroup[],
): CursorResult[] {
  const lastVg = verseGroups[verseGroups.length - 1];
  let lastAssigned: CursorResult["assignedVerse"] = {
    book: lastVg.book,
    chapter: lastVg.chapter,
    verse: lastVg.verse,
  };
  for (let i = 0; i < mergedSource.length; i++) {
    if (!mergedResult[i]) {
      mergedResult[i] = { ...mergedSource[i], assignedVerse: lastAssigned };
    } else {
      lastAssigned = mergedResult[i].assignedVerse;
    }
  }

  const result: CursorResult[] = new Array(source.length);
  let origIdx = 0;
  for (let mi = 0; mi < mergedSource.length; mi++) {
    const span = spanOf[mi];
    const av = mergedResult[mi].assignedVerse;
    for (let s = 0; s < span; s++) {
      result[origIdx] = { ...source[origIdx], assignedVerse: av };
      origIdx++;
    }
  }
  return result;
}
