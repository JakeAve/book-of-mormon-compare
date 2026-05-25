import { matches } from "./match.ts";
import type {
  CursorResult,
  LineInfo,
  SourceWord,
  TargetWord,
} from "./types.ts";
import type { VerseGroup } from "./tokenize-target.ts";

// ── Heading detection ──────────────────────────────────────────────────────

function isChapterHeading(text: string): boolean {
  // Normalize: strip punctuation, lowercase, collapse whitespace
  const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ")
    .trim();
  // Must start with the heading marker (^ anchor prevents mid-sentence false positives).
  // Book names are restricted to known BoM books so "book of Moses", "book of Lamb" etc. don't fire.
  return (
    /^chapter\s+([ivxlc]+|[0-9]+)\b/.test(t) ||
    /^the (first|second|third|fourth) book of\b/.test(t) ||
    /^the book of (nephi|jacob|enos|jarom|omni|mosiah|alma|helaman|mormon|ether|moroni)\b/
      .test(t) ||
    /^words of mormon\b/.test(t)
  );
}

// ── Source segmentation ────────────────────────────────────────────────────

interface SourceSegment {
  words: SourceWord[];
  /** Index of first word in the original source array. */
  startIdx: number;
  /** Normalized heading text that starts this segment (empty for segment 0). */
  headingText: string;
}

function segmentSource(
  source: SourceWord[],
  lineInfos: Map<string, LineInfo>,
): SourceSegment[] {
  // (boundaryIdx, headingText) pairs — first segment has no heading
  const boundaries: Array<{ idx: number; heading: string }> = [
    { idx: 0, heading: "" },
  ];
  let prevLineKey = "";
  for (let i = 0; i < source.length; i++) {
    const lk = `${source[i].page}:${source[i].line}`;
    if (lk !== prevLineKey) {
      prevLineKey = lk;
      const info = lineInfos.get(lk);
      if (info && isChapterHeading(info.text) && i > 0) {
        const norm = info.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
          .replace(/\s+/g, " ").trim();
        boundaries.push({ idx: i, heading: norm });
      }
    }
  }
  boundaries.push({ idx: source.length, heading: "" });

  const segments: SourceSegment[] = [];
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const start = boundaries[i].idx;
    const end = boundaries[i + 1].idx;
    if (end > start) {
      segments.push({
        words: source.slice(start, end),
        startIdx: start,
        headingText: boundaries[i].heading,
      });
    }
  }
  return segments;
}

// Map a normalized segment heading to the canonical book slug it starts.
// Returns null for chapter headings (which don't change the book).
function headingToBook(normalized: string): string | null {
  if (/^the book of mormon\b/.test(normalized)) return "title-page";
  if (/^the first book of nephi\b/.test(normalized)) return "1-ne";
  // 1-ne: "his" immediately follows "Nephi" — unique to 1 Nephi heading
  if (/^the book of nephi\s+his\b/.test(normalized)) return "1-ne";
  if (/^the first book of nephi\b/.test(normalized)) return "1-ne";
  if (/^the second book of nephi\b/.test(normalized)) return "2-ne";
  // 3-ne: requires "son of nephi" to exclude mid-text references
  if (/^the book of nephi\b.*\bson of nephi\b/.test(normalized)) return "3-ne";
  if (/^the book of jacob\b/.test(normalized)) return "jacob";
  if (/^the book of enos\b/.test(normalized)) return "enos";
  if (/^the book of jarom\b/.test(normalized)) return "jarom";
  if (/^the book of omni\b/.test(normalized)) return "omni";
  if (/^words of mormon\b/.test(normalized)) return "w-of-m";
  if (/^the book of mosiah\b/.test(normalized)) return "mosiah";
  if (/^the book of alma\b/.test(normalized)) return "alma";
  if (/^the book of helaman\b/.test(normalized)) return "hel";
  if (/^the book of ether\b/.test(normalized)) return "ether";
  if (/^the book of moroni\b/.test(normalized)) return "moro";
  return null; // chapter heading or mid-text reference — no book change
}

// ── Tuning constants ──────────────────────────────────────────────────────

/** Search window multiplier per canonical verse. With WINDOW_SLACK = 1.5 the
 *  LCS sees enough source words to capture the verse's content plus a small
 *  look-ahead, while staying small enough to avoid the next verse's vocabulary
 *  dominating the match. */
const WINDOW_SLACK = 1.5;

/** Minimum source-word window per canonical verse — ensures even very short
 *  verses (chapter headings, single-line verses) have enough source to match. */
const WINDOW_MIN = 20;

/** Consume cap multiplier: at most this many source words per canonical word.
 *  10% slack lets each verse capture any extra PM verbosity (scribal additions,
 *  duplicated words) without leaving them for the next verse to inherit as
 *  leading-bleed, while staying tight enough to avoid exhausting source before
 *  the end of long books. */
const CONSUME_SLACK = 1.10;

/** Minimum source words consumed per canonical verse (prevents stalling on
 *  very short verses). */
const CONSUME_MIN = 3;

/** Match fraction threshold above which we trust lastMatchedSrc directly
 *  (no consume cap). Only EVERY canonical word matched (= 1.0) bypasses the
 *  cap — that's a strong signal the last match is genuinely the verse boundary
 *  (e.g. short heading-style verses like "The Testimony of Eight Witnesses"
 *  where leading unmatched words push lastMatchedSrc just past expectedConsume). */
const HIGH_MATCH_FRACTION = 1.0;

// ── Per-verse LCS ──────────────────────────────────────────────────────────
//
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
interface VerseLCSResult {
  /** canon-word index per source word (-1 = unmatched, filled by fillGaps) */
  assignments: Int32Array;
  /** Last source position matched to any canonical word in this verse. */
  lastMatchedSrc: number;
  /** Number of canonical words actually matched (0..n). Used by the cursor to
   *  decide whether to trust lastMatchedSrc directly or apply the consume cap. */
  matchedCount: number;
}

function verseLCS(
  window: SourceWord[],
  canonWords: TargetWord[],
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
      ds[i][j] = matches(window[i].norm, canonWords[j].norm)
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
      matches(window[fi].norm, canonWords[fj].norm) &&
      ds[fi][fj] === ds[fi + 1][fj + 1] + 1
    ) {
      assignments[fi] = fj;
      lastMatchedSrc = fi;
      matchedCount++;
      fi++;
      fj++;
    } else if (ds[fi + 1][fj] >= ds[fi][fj + 1]) {
      fi++; // skip source word: future LCS without it is at least as good
    } else {
      fj++; // skip canonical word: must advance canonical to maintain LCS
    }
  }
  return { assignments, lastMatchedSrc, matchedCount };
}

// ── Line-break split joining ───────────────────────────────────────────────
//
// Manuscript line breaks sometimes fall mid-word. Detect pairs of adjacent
// tokens from different source lines where the combined norm is a canonical
// word (e.g. "wher" + "efore" → "wherefore"). Merge them before the LCS so
// the aligner can match the full word correctly. The caller must expand the
// merged result back to the original source indices after verse assignment.

interface MergeResult {
  words: SourceWord[];
  /** Maps merged-array index → count of original source words it replaced (1 or 2). */
  spanOf: Uint8Array;
}

function mergeLineBreakSplits(
  source: SourceWord[],
  canonNorms: Set<string>,
): MergeResult {
  const words: SourceWord[] = [];
  const spanOf: Uint8Array = new Uint8Array(source.length); // upper bound
  let i = 0;
  while (i < source.length) {
    const w = source[i];
    const next = source[i + 1];
    if (
      next !== undefined &&
      w.line !== next.line && // tokens are on different source lines
      canonNorms.has(w.norm + next.norm) && // combined is a canonical word
      !canonNorms.has(w.norm) // first fragment alone is not canonical
    ) {
      spanOf[words.length] = 2;
      words.push({ ...w, norm: w.norm + next.norm });
      i += 2;
    } else {
      spanOf[words.length] = 1;
      words.push(w);
      i++;
    }
  }
  return { words, spanOf };
}

function fillGaps(a: Int32Array, maxIdx: number): void {
  // Forward-fill -1s with the most recent matched canonical index.
  // Use -1 as sentinel (not 0) so a legitimate index-0 match is preserved.
  let cur = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== -1) cur = a[i];
    else if (cur >= 0) a[i] = cur;
    // else: still -1, handled by back-fill below
  }
  // Back-fill any leading -1s with the first real assignment.
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
  // Clamp to valid range.
  for (let i = 0; i < a.length; i++) {
    if (a[i] > maxIdx) a[i] = maxIdx;
    if (a[i] < 0) a[i] = 0;
  }
}

// ── Main export ───────────────────────────────────────────────────────────

export function runCursor(
  source: SourceWord[],
  verseGroups: VerseGroup[],
  lineInfos: Map<string, LineInfo> = new Map(),
): CursorResult[] {
  if (source.length === 0 || verseGroups.length === 0) return [];

  // Pre-merge line-break splits: "wher" + "efore" → "wherefore".
  // Build the canonical norm set once from all verse groups.
  const allCanonNorms = new Set(
    verseGroups.flatMap((vg) => vg.words.map((w) => w.norm)),
  );
  const { words: mergedSource, spanOf } = mergeLineBreakSplits(
    source,
    allCanonNorms,
  );

  // Phase 1: segment source at chapter headings (hard anchors that reset drift)
  const segments = segmentSource(mergedSource, lineInfos);

  // Build index: canonical book slug → first index in verseGroups
  const bookStart = new Map<string, number>();
  for (let i = 0; i < verseGroups.length; i++) {
    const b = verseGroups[i].book;
    if (!bookStart.has(b)) bookStart.set(b, i);
  }

  // Expected source words per canonical word (use original source length so the
  // ratio reflects the true PM/canonical proportion before merging).
  const totalCanonWords = verseGroups.reduce((s, vg) => s + vg.words.length, 0);
  const srcPerCanon = totalCanonWords > 0
    ? source.length / totalCanonWords
    : 1.1;

  // Result indexed by mergedSource position; expanded to original source length below.
  const mergedResult: CursorResult[] = new Array(mergedSource.length);
  let vgIdx = 0;

  // Precompute verse-group limit for each segment: don't process past the
  // first verse group of the book that starts in the next book-heading segment.
  // This prevents a segment from consuming verse groups that belong to a
  // different PM source segment.
  const segVgLimits: number[] = segments.map(() => verseGroups.length);
  for (let si = 0; si < segments.length; si++) {
    for (let sj = si + 1; sj < segments.length; sj++) {
      if (!segments[sj].headingText) continue;
      const nextBook = headingToBook(segments[sj].headingText);
      if (nextBook !== null) {
        const nextStart = bookStart.get(nextBook);
        if (nextStart !== undefined) {
          segVgLimits[si] = nextStart;
          break;
        }
      }
    }
  }

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
    let srcOffset = 0; // position within this segment

    // Process one canonical verse at a time. Per-verse windows are small
    // (~20-50 source words) so the next verse's vocabulary is never in view,
    // and any drift is bounded to a single verse before the next iteration
    // recovers via its own LCS.
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
          Math.round(vg.words.length * srcPerCanon * WINDOW_SLACK),
          WINDOW_MIN,
        ),
      );
      const window = available.slice(0, windowSize);

      const { assignments: rawAssignments, lastMatchedSrc, matchedCount } =
        verseLCS(window, vg.words);

      fillGaps(rawAssignments, vg.words.length - 1);

      const expectedConsume = Math.max(
        Math.round(vg.words.length * srcPerCanon * CONSUME_SLACK),
        CONSUME_MIN,
      );

      // If the LCS found no matches AND we're near the end of this segment,
      // don't advance vgIdx — the verse's actual content is likely in the next
      // segment (e.g. a PM chapter heading split the verse across segments).
      // The trailing fill will assign these residual source words to the
      // previous verse, which is the natural place for them.
      const segRemaining = seg.words.length - srcOffset;
      const nearSegmentEnd = segRemaining <= expectedConsume / 2;
      if (lastMatchedSrc < 0 && nearSegmentEnd) {
        break; // exit segment loop without advancing vgIdx
      }

      // High-confidence path: when the LCS matched most of the verse's
      // canonical words (≥ HIGH_MATCH_FRACTION), trust lastMatchedSrc directly
      // and skip the consume cap. The cap is meant for low-match cases where
      // the LCS may have matched into the next verse's territory; with a
      // high match rate, lastMatchedSrc is the precise verse boundary.
      const matchFraction = matchedCount / vg.words.length;
      const consumeCount = lastMatchedSrc >= 0
        ? (matchFraction >= HIGH_MATCH_FRACTION
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

  // Assign any remaining merged-source words to the last known verse
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

  // Expand merged tokens back to original source indices.
  // A merged token (spanOf = 2) emits two CursorResult entries — one for each
  // original source fragment — both with the same assignedVerse. This lets the
  // segment builder produce separate line entries that applyJoins then joins.
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
