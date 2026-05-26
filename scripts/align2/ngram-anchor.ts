// Unique n-gram anchor pairs between source and target token streams.
//
// Adapted from the legacy aligner. The idea: any n-gram that appears EXACTLY
// ONCE in both source and target is an unambiguous match — a strong (s, t)
// anchor pair. Collect those, sort by s, then take a longest-increasing-
// subsequence on t to discard the rare cross-overs.
//
// The output is a strictly monotone scaffold (a₀.s < a₁.s < … and a₀.t <
// a₁.t < …) spanning wherever source and target share unique phrases. Layer
// multiple n values (6 → 4 → 3) so sparse regions still get coverage.
//
// This is the right primitive for fragmentary sources (OM): the scaffold
// pins source words to target positions globally, so the rest of the
// pipeline only needs to fill in between anchors. The per-segment anchor in
// `anchor.ts` is a single point; this is a backbone.

export interface AnchorToken {
  /** Normalized word — only this field is used for matching. */
  norm: string;
}

export interface AnchorPair {
  /** Index into the source token stream. */
  s: number;
  /** Index into the target token stream. */
  t: number;
}

function ngramKey(
  tokens: AnchorToken[],
  start: number,
  n: number,
): string | null {
  if (start + n > tokens.length) return null;
  let key = tokens[start].norm;
  for (let k = 1; k < n; k++) key += " " + tokens[start + k].norm;
  return key;
}

function uniqueNgramPositions(
  tokens: AnchorToken[],
  n: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  const first = new Map<string, number>();
  for (let i = 0; i + n <= tokens.length; i++) {
    const k = ngramKey(tokens, i, n)!;
    const c = counts.get(k);
    if (c === undefined) {
      counts.set(k, 1);
      first.set(k, i);
    } else {
      counts.set(k, c + 1);
    }
  }
  const unique = new Map<string, number>();
  for (const [k, c] of counts) if (c === 1) unique.set(k, first.get(k)!);
  return unique;
}

/** Anchor pairs for one n-gram size. */
export function buildAnchors(
  source: AnchorToken[],
  target: AnchorToken[],
  n: number,
): AnchorPair[] {
  const src = uniqueNgramPositions(source, n);
  const tgt = uniqueNgramPositions(target, n);
  const pairs: AnchorPair[] = [];
  for (const [key, si] of src) {
    const ti = tgt.get(key);
    if (ti !== undefined) pairs.push({ s: si, t: ti });
  }
  pairs.sort((a, b) => a.s - b.s);
  return longestIncreasingByT(pairs);
}

/** Cascade through n values largest-first, layering smaller n only where it
 *  doesn't violate monotonicity. */
export function buildAnchorsMulti(
  source: AnchorToken[],
  target: AnchorToken[],
  ns: number[],
): AnchorPair[] {
  const sorted = [...ns].sort((a, b) => b - a);
  let anchors: AnchorPair[] = [];
  for (const n of sorted) {
    const next = buildAnchors(source, target, n);
    anchors = mergeMonotone(anchors, next);
  }
  return anchors;
}

function mergeMonotone(a: AnchorPair[], b: AnchorPair[]): AnchorPair[] {
  const all = [...a, ...b];
  all.sort((x, y) => x.s - y.s || x.t - y.t);
  const dedup: AnchorPair[] = [];
  for (const p of all) {
    const last = dedup[dedup.length - 1];
    if (last && last.s === p.s && last.t === p.t) continue;
    dedup.push(p);
  }
  return longestIncreasingByT(dedup);
}

function longestIncreasingByT(pairs: AnchorPair[]): AnchorPair[] {
  if (pairs.length === 0) return [];
  const tails: number[] = [];
  const tailsIdx: number[] = [];
  const prev: number[] = new Array(pairs.length).fill(-1);
  for (let i = 0; i < pairs.length; i++) {
    const t = pairs[i].t;
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tailsIdx[lo - 1];
    if (lo === tails.length) {
      tails.push(t);
      tailsIdx.push(i);
    } else {
      tails[lo] = t;
      tailsIdx[lo] = i;
    }
  }
  const result: AnchorPair[] = [];
  let cur = tailsIdx[tailsIdx.length - 1];
  while (cur !== -1) {
    result.push(pairs[cur]);
    cur = prev[cur];
  }
  return result.reverse();
}

/**
 * Build a piecewise-linear map from source token index to target token index
 * using the anchor scaffold. For source positions before the first anchor,
 * extrapolate using the global ratio; same for positions after the last.
 *
 * Returns an Int32Array of length sourceLength where result[i] is the target
 * token index for source token i (clamped to [0, targetLength - 1]).
 */
export function interpolateScaffold(
  anchors: AnchorPair[],
  sourceLength: number,
  targetLength: number,
): Int32Array {
  const out = new Int32Array(sourceLength);
  if (sourceLength === 0) return out;
  if (anchors.length === 0) {
    const ratio = sourceLength > 0 ? targetLength / sourceLength : 1;
    for (let i = 0; i < sourceLength; i++) {
      out[i] = Math.min(targetLength - 1, Math.max(0, Math.round(i * ratio)));
    }
    return out;
  }
  // Pre-extension: linearly extrapolate from anchors[0] to source idx 0.
  // Assume same slope as anchors[0]→anchors[1] (or 1 if there's only one).
  const slope0 = anchors.length > 1
    ? (anchors[1].t - anchors[0].t) / (anchors[1].s - anchors[0].s)
    : 1;
  // Post-extension: same slope from the last anchor onward.
  const slopeN = anchors.length > 1
    ? (anchors[anchors.length - 1].t - anchors[anchors.length - 2].t) /
      (anchors[anchors.length - 1].s - anchors[anchors.length - 2].s)
    : 1;

  let ai = 0;
  for (let i = 0; i < sourceLength; i++) {
    // Advance ai so that anchors[ai].s <= i < anchors[ai+1].s (or ai = last).
    while (ai + 1 < anchors.length && anchors[ai + 1].s <= i) ai++;
    let t: number;
    if (i <= anchors[0].s) {
      t = anchors[0].t + (i - anchors[0].s) * slope0;
    } else if (i >= anchors[anchors.length - 1].s) {
      const last = anchors[anchors.length - 1];
      t = last.t + (i - last.s) * slopeN;
    } else {
      const a = anchors[ai];
      const b = anchors[ai + 1];
      const frac = (i - a.s) / (b.s - a.s);
      t = a.t + frac * (b.t - a.t);
    }
    if (t < 0) t = 0;
    if (t > targetLength - 1) t = targetLength - 1;
    out[i] = Math.round(t);
  }
  return out;
}
