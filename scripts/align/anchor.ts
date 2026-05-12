// Anchor-based sequence alignment.
//
// Given two token streams S (source) and T (target), we want pairs (i, j) such
// that S[i] aligns to T[j]. We don't need every token — just enough monotone
// anchors that we can interpolate the rest.
//
// Algorithm:
//   1. Count n-gram frequencies in both streams.
//   2. Collect n-grams that occur exactly once in BOTH → unambiguous anchors.
//   3. Sort the resulting (i, j) pairs by i and take the longest-increasing-
//      subsequence on j. That kills any cross-overs (rare, but possible when
//      a "unique" phrase moved between editions).
//   4. The output is a strictly monotone list of (i, j) anchor pairs.
//
// Falling back to smaller n on sparse regions is handled by the caller (it can
// call buildAnchors() with multiple n values and merge the results).

import type { Token } from "./types.ts";

export interface AnchorPair {
  /** Index into source token stream. */
  s: number;
  /** Index into target token stream. */
  t: number;
}

function ngramKey(tokens: Token[], start: number, n: number): string | null {
  if (start + n > tokens.length) return null;
  let key = tokens[start].norm;
  for (let k = 1; k < n; k++) key += " " + tokens[start + k].norm;
  return key;
}

function uniqueNgramPositions(
  tokens: Token[],
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

export function buildAnchors(
  source: Token[],
  target: Token[],
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

/** Build anchors with multiple n-gram sizes, preferring larger n first. */
export function buildAnchorsMulti(
  source: Token[],
  target: Token[],
  ns: number[],
): AnchorPair[] {
  // Strategy: start with the largest n. For positions not yet covered, layer
  // in smaller-n anchors that don't violate monotonicity with the existing set.
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
  // Dedupe identical (s,t).
  const dedup: AnchorPair[] = [];
  for (const p of all) {
    const last = dedup[dedup.length - 1];
    if (last && last.s === p.s && last.t === p.t) continue;
    dedup.push(p);
  }
  return longestIncreasingByT(dedup);
}

function longestIncreasingByT(pairs: AnchorPair[]): AnchorPair[] {
  // Classic patience LIS on the t coordinate, with strict monotonicity in s too
  // (input is pre-sorted by s, but s can have duplicates if same source pos
  // matches multiple targets — shouldn't happen with unique n-grams, but be
  // defensive).
  if (pairs.length === 0) return [];
  const tails: number[] = []; // tails[i] = smallest t ending an LIS of length i+1
  const tailsIdx: number[] = []; // index in `pairs` for tails[i]
  const prev: number[] = new Array(pairs.length).fill(-1);
  for (let i = 0; i < pairs.length; i++) {
    const t = pairs[i].t;
    // Find first tails >= t (strict increase in t).
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
