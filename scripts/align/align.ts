// Public alignment API. Takes source fragments + target verses, returns each
// source fragment tagged with the canonical verse range it covers.

import type {
  AlignedFragment,
  SourceFragment,
  TargetVerse,
  Token,
  VerseSegment,
} from "./types.ts";
import { type NormalizeOptions, tokenStream } from "./normalize.ts";
import { type AnchorPair, buildAnchorsMulti } from "./anchor.ts";

export interface AlignOptions extends NormalizeOptions {
  /** N-gram sizes to try for anchor matching, in any order. Default [6,4,3]. */
  ngrams?: number[];
  /**
   * Max ratio of (target-token span) / (source-token count) per fragment. If a
   * fragment's anchored extremes are further apart than this, the outlying
   * anchors are dropped (stray matches across lacunae). Default: 4.
   */
  maxSpanRatio?: number;
  /**
   * How many target verses beyond the fragment's anchored extremes we trust
   * interpolation to reach. Default 2: small enough to keep neighbor drift in
   * check, large enough to cover normal edition-level verse splits.
   */
  verseSlack?: number;
}

export interface AlignResult {
  aligned: AlignedFragment[];
  /** Diagnostic info — useful when tuning. */
  stats: {
    sourceTokens: number;
    targetTokens: number;
    anchors: number;
  };
}

export function align(
  fragments: SourceFragment[],
  verses: TargetVerse[],
  opts: AlignOptions = {},
): AlignResult {
  const ngrams = opts.ngrams ?? [6, 4, 3];
  const maxSpanRatio = opts.maxSpanRatio ?? 4;
  const srcTokens = tokenStream(fragments, opts);
  const tgtTokens = tokenStream(verses, opts);
  let anchors = buildAnchorsMulti(srcTokens, tgtTokens, ngrams);

  // Drop outlier anchors: for each fragment, if anchors disagree wildly on the
  // target position (more than maxSpanRatio × source-token count apart), the
  // far ones are stray matches across a lacuna. Keep the densest cluster.
  anchors = pruneOutlierAnchors(anchors, srcTokens, fragments.length, maxSpanRatio);

  // Per fragment: use interpolated token positions to build a verse range, BUT
  // (1) only for fragments with at least one anchor of their own and (2) clamp
  // the final range to within ±verseSlack verses of the fragment's anchored
  // extremes. Without (2), tokens at fragment edges drift toward the next
  // fragment's anchors and drag the range through unrelated content (e.g. an
  // OM line ending Enos pulling its range through jarom/omni into Mosiah).
  const matchedFlag = matchedSourceIndices(anchors);
  const sToT = interpolate(anchors, srcTokens.length, tgtTokens.length);

  // Anchored verse extremes per fragment.
  const anchorLo = new Int32Array(fragments.length).fill(-1);
  const anchorHi = new Int32Array(fragments.length).fill(-1);
  for (const a of anchors) {
    const f = srcTokens[a.s].ownerIdx;
    const v = tgtTokens[a.t].ownerIdx;
    if (anchorLo[f] === -1 || v < anchorLo[f]) anchorLo[f] = v;
    if (anchorHi[f] === -1 || v > anchorHi[f]) anchorHi[f] = v;
  }

  const verseSlack = opts.verseSlack ?? 2;
  type Range = { lo: number; hi: number; matched: number; total: number };
  const ranges = new Map<number, Range>();
  // Per-fragment token-to-verse assignments. Index in the inner array is the
  // local token index within the fragment (0-based). Value is the verse index
  // that token aligns to, or -1 if it had no usable mapping.
  const perToken = new Map<number, number[]>();
  // Track local token index as we walk srcTokens (which is in fragment order).
  let localIdx = 0;
  let lastOwner = -1;
  for (let i = 0; i < srcTokens.length; i++) {
    const ownerIdx = srcTokens[i].ownerIdx;
    if (ownerIdx !== lastOwner) {
      localIdx = 0;
      lastOwner = ownerIdx;
    }
    const k = localIdx++;
    if (anchorLo[ownerIdx] === -1) continue; // no own anchors → skip range pass
    const tIdx = sToT[i];
    if (tIdx < 0) continue;
    let verseIdx = tgtTokens[tIdx].ownerIdx;
    // Clamp to anchored extremes ± slack.
    const min = Math.max(0, anchorLo[ownerIdx] - verseSlack);
    const max = Math.min(verses.length - 1, anchorHi[ownerIdx] + verseSlack);
    if (verseIdx < min) verseIdx = min;
    if (verseIdx > max) verseIdx = max;
    let r = ranges.get(ownerIdx);
    if (!r) {
      r = { lo: verseIdx, hi: verseIdx, matched: 0, total: 0 };
      ranges.set(ownerIdx, r);
    } else {
      if (verseIdx < r.lo) r.lo = verseIdx;
      if (verseIdx > r.hi) r.hi = verseIdx;
    }
    r.total++;
    if (matchedFlag[i]) r.matched++;
    let pt = perToken.get(ownerIdx);
    if (!pt) {
      pt = [];
      perToken.set(ownerIdx, pt);
    }
    while (pt.length < k) pt.push(-1);
    pt.push(verseIdx);
  }
  // Per-fragment total token counts (for sizing perToken arrays of unanchored
  // fragments and for ensuring trailing -1s on partially-mapped ones).
  const fragSize = new Int32Array(fragments.length);
  for (const tok of srcTokens) fragSize[tok.ownerIdx]++;
  for (const [idx, pt] of perToken) {
    while (pt.length < fragSize[idx]) pt.push(-1);
  }

  // Fill in fragments that have no anchors of their own by placing them in
  // the gap between the nearest anchored fragments before and after. These
  // ranges are flagged with matchedTokens=0 so callers can treat them as
  // low-confidence (typically scribally-divergent Isaiah quotations etc.).
  fillUnanchored(fragments.length, ranges, verses.length);

  const aligned: AlignedFragment[] = [];
  for (let i = 0; i < fragments.length; i++) {
    const r = ranges.get(i);
    if (!r) continue;
    const startV = verses[r.lo];
    const endV = verses[r.hi];
    const segments = buildSegments(
      perToken.get(i),
      fragSize[i],
      r,
      verses,
    );
    aligned.push({
      id: fragments[i].id,
      start: {
        book: startV.book,
        chapter: startV.chapter,
        verse: startV.verse,
      },
      end: { book: endV.book, chapter: endV.chapter, verse: endV.verse },
      matchedTokens: r.matched,
      totalTokens: r.total,
      segments,
      meta: fragments[i].meta,
    });
  }

  return {
    aligned,
    stats: {
      sourceTokens: srcTokens.length,
      targetTokens: tgtTokens.length,
      anchors: anchors.length,
    },
  };
}

/**
 * For each source token index, return the interpolated target token index
 * (or -1 if outside the anchor range). Linear interpolation between adjacent
 * anchors; clamps to the nearest anchor outside the range.
 */
function interpolate(
  anchors: AnchorPair[],
  srcLen: number,
  tgtLen: number,
): Int32Array {
  const out = new Int32Array(srcLen).fill(-1);
  if (anchors.length === 0) return out;
  // Walk source positions in order, advancing the anchor cursor.
  let ai = 0;
  for (let s = 0; s < srcLen; s++) {
    while (ai < anchors.length - 1 && anchors[ai + 1].s <= s) ai++;
    const left = anchors[ai];
    const right = ai + 1 < anchors.length ? anchors[ai + 1] : null;
    if (right && s >= left.s && s <= right.s) {
      const span = right.s - left.s;
      const frac = span === 0 ? 0 : (s - left.s) / span;
      const t = Math.round(left.t + frac * (right.t - left.t));
      out[s] = clamp(t, 0, tgtLen - 1);
    } else if (!right || s <= left.s) {
      // Before first anchor or single-anchor case.
      out[s] = clamp(left.t + (s - left.s), 0, tgtLen - 1);
    } else {
      out[s] = clamp(right.t + (s - right.s), 0, tgtLen - 1);
    }
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/**
 * Drop anchors that put a fragment's target span at more than `maxRatio` times
 * the fragment's source-token count. Mechanism: for each fragment with >1
 * anchor, compute the median target position; drop anchors whose target is
 * farther than `maxRatio × sourceTokens` from the median.
 */
function pruneOutlierAnchors(
  anchors: AnchorPair[],
  srcTokens: Token[],
  fragCount: number,
  maxRatio: number,
): AnchorPair[] {
  const byFrag: AnchorPair[][] = Array.from({ length: fragCount }, () => []);
  const fragSize = new Int32Array(fragCount);
  for (const tok of srcTokens) fragSize[tok.ownerIdx]++;
  for (const a of anchors) byFrag[srcTokens[a.s].ownerIdx].push(a);

  const keep = new Set<AnchorPair>();
  for (let f = 0; f < fragCount; f++) {
    const arr = byFrag[f];
    if (arr.length <= 1) {
      for (const a of arr) keep.add(a);
      continue;
    }
    const ts = arr.map((a) => a.t).sort((x, y) => x - y);
    const median = ts[ts.length >> 1];
    const maxDist = Math.max(20, maxRatio * fragSize[f]);
    for (const a of arr) if (Math.abs(a.t - median) <= maxDist) keep.add(a);
  }
  return anchors.filter((a) => keep.has(a));
}

/**
 * Place fragments that had no anchors of their own into the gap between the
 * nearest anchored fragment before and after. Modifies `ranges` in place.
 */
function fillUnanchored(
  fragCount: number,
  ranges: Map<number, { lo: number; hi: number; matched: number; total: number }>,
  verseCount: number,
): void {
  // For each fragment without a range, find prevIdx (last anchored fragment
  // before it) and nextIdx (first after). Assign [prev.hi + 1, next.lo - 1],
  // falling back to neighbor's range if the gap is empty/negative.
  const prevLo = new Int32Array(fragCount);
  const prevHi = new Int32Array(fragCount);
  prevLo.fill(-1);
  prevHi.fill(-1);
  let lastLo = -1;
  let lastHi = -1;
  for (let i = 0; i < fragCount; i++) {
    const r = ranges.get(i);
    if (r) {
      lastLo = r.lo;
      lastHi = r.hi;
    }
    prevLo[i] = lastLo;
    prevHi[i] = lastHi;
  }
  const nextLo = new Int32Array(fragCount);
  const nextHi = new Int32Array(fragCount);
  nextLo.fill(-1);
  nextHi.fill(-1);
  lastLo = -1;
  lastHi = -1;
  for (let i = fragCount - 1; i >= 0; i--) {
    const r = ranges.get(i);
    if (r) {
      lastLo = r.lo;
      lastHi = r.hi;
    }
    nextLo[i] = lastLo;
    nextHi[i] = lastHi;
  }
  for (let i = 0; i < fragCount; i++) {
    if (ranges.has(i)) continue;
    let lo: number, hi: number;
    if (prevHi[i] >= 0 && nextLo[i] >= 0) {
      lo = prevHi[i] + 1;
      hi = nextLo[i] - 1;
      if (lo > hi) { // adjacent or overlapping → pick the midpoint verse
        lo = hi = Math.min(prevHi[i], nextLo[i]);
      }
    } else if (prevHi[i] >= 0) {
      lo = hi = prevHi[i];
    } else if (nextLo[i] >= 0) {
      lo = hi = nextLo[i];
    } else {
      continue; // no anchored fragment anywhere — give up
    }
    lo = Math.max(0, Math.min(verseCount - 1, lo));
    hi = Math.max(0, Math.min(verseCount - 1, hi));
    ranges.set(i, { lo, hi, matched: 0, total: 0 });
  }
}

/**
 * Group a fragment's per-token verse assignments into contiguous segments. A
 * segment is a run of consecutive tokens that map to the same canonical verse.
 *
 * Tokens with no assignment (-1) inherit their neighbor's verse: forward-fill
 * first (every -1 takes the most recent assigned verse), then back-fill the
 * leading -1s. If the fragment has no assignments at all (zero anchors),
 * return one segment covering the whole fragment at the fallback range's lo.
 */
function buildSegments(
  perToken: number[] | undefined,
  totalTokens: number,
  fallback: { lo: number; hi: number },
  verses: TargetVerse[],
): VerseSegment[] {
  const verseAt = (idx: number): VerseSegment["verse"] => {
    const v = verses[idx];
    return { book: v.book, chapter: v.chapter, verse: v.verse };
  };

  if (!perToken || perToken.length === 0 || totalTokens === 0) {
    return [{ verse: verseAt(fallback.lo), tokenStart: 0, tokenEnd: totalTokens }];
  }

  // Forward-fill -1s with the most recent assigned verse, back-fill leading -1s
  // with the first assigned verse, and ensure boundaries fall in [lo, hi].
  const filled = perToken.slice();
  let firstAssigned = -1;
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] !== -1) {
      firstAssigned = filled[i];
      break;
    }
  }
  if (firstAssigned === -1) firstAssigned = fallback.lo;
  let cur = firstAssigned;
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] === -1) filled[i] = cur;
    else cur = filled[i];
  }

  // Enforce monotonicity — once we've moved into a later verse, don't drift
  // back. Cheap pass: if filled[i] < filled[i-1], lift it up to filled[i-1].
  for (let i = 1; i < filled.length; i++) {
    if (filled[i] < filled[i - 1]) filled[i] = filled[i - 1];
  }

  const segs: VerseSegment[] = [];
  let start = 0;
  for (let i = 1; i < filled.length; i++) {
    if (filled[i] !== filled[i - 1]) {
      segs.push({ verse: verseAt(filled[i - 1]), tokenStart: start, tokenEnd: i });
      start = i;
    }
  }
  segs.push({
    verse: verseAt(filled[filled.length - 1]),
    tokenStart: start,
    tokenEnd: filled.length,
  });
  return segs;
}

function matchedSourceIndices(anchors: AnchorPair[]): Uint8Array {
  // Flag the source indices that participate in the monotone anchor set. The
  // array length is one past the last anchor; callers using it for token-level
  // counts should treat unset indices as 0 even past this length (Uint8Array
  // bounds checks handle that).
  let max = 0;
  for (const a of anchors) if (a.s > max) max = a.s;
  const flags = new Uint8Array(max + 1);
  for (const a of anchors) flags[a.s] = 1;
  return flags;
}
