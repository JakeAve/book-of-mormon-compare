import { matches } from "./match.ts";
import type { CursorResult, LineInfo, SourceWord } from "./types.ts";
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

/** Fraction of canonical chapter words counted as the "tail" for boundary
 *  anchoring. The last matched source position within this tail determines
 *  the chapter cut-point, preventing common words later in the source from
 *  inflating the advance past the real chapter end. */
const CHAPTER_TAIL_FRACTION = 0.15;

/** Minimum number of canonical words in the tail window, regardless of
 *  chapter length. */
const CHAPTER_TAIL_MIN = 10;

/** Search window multiplier: how many source words to look at per canonical
 *  chapter word. 1.2 gives 20% slack over the expected PM/canonical ratio. */
const WINDOW_SLACK = 1.2;

/** Minimum source-word window per canonical chapter. */
const WINDOW_MIN = 30;

/** Consume cap multiplier: at most this many source words per canonical word.
 *  5% slack over the PM/canonical ratio lets the LCS reach the last word of
 *  a chapter without systematically cutting a word or two short. */
const CONSUME_SLACK = 1.05;

/** Minimum source words consumed per canonical chapter (prevents stalling on
 *  very short chapters like single-verse headings). */
const CONSUME_MIN = 5;

// ── Per-chapter LCS ────────────────────────────────────────────────────────
//
// Returns:
//   assignments — canon-word index per source word (-1 = unmatched)
//   lastTailMatchedSrc — last source position that matched a canonical word
//     in the chapter's tail (final CHAPTER_TAIL_FRACTION of canonical words).
//     Used as the primary boundary anchor; the global last match is only a
//     fallback for chapters whose tail produces no matches.
//
// O(m*n) where m ≤ window size, n ≤ canonical chapter words.
interface ChapterLCSResult {
  assignments: Int32Array;
  lastTailMatchedSrc: number;
  lastMatchedSrc: number;
}

function chapterLCS(
  window: SourceWord[],
  canonWords: Array<{ norm: string; vg: VerseGroup }>,
): ChapterLCSResult {
  const m = window.length;
  const n = canonWords.length;
  const assignments = new Int32Array(m).fill(-1);
  const empty: ChapterLCSResult = {
    assignments,
    lastTailMatchedSrc: -1,
    lastMatchedSrc: -1,
  };
  if (m === 0 || n === 0) return empty;

  const dp: Uint16Array[] = Array.from(
    { length: m + 1 },
    () => new Uint16Array(n + 1),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = matches(window[i - 1].norm, canonWords[j - 1].norm)
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // The canonical tail starts at this index — matches here anchor the boundary.
  const tailStart = Math.max(
    n - Math.max(Math.round(n * CHAPTER_TAIL_FRACTION), CHAPTER_TAIL_MIN),
    0,
  );

  let i = m, j = n;
  let lastTailMatchedSrc = -1;
  let lastMatchedSrc = -1;
  while (i > 0 && j > 0) {
    if (matches(window[i - 1].norm, canonWords[j - 1].norm)) {
      assignments[i - 1] = j - 1;
      if (lastMatchedSrc === -1) lastMatchedSrc = i - 1;
      if (j - 1 >= tailStart && lastTailMatchedSrc === -1) {
        lastTailMatchedSrc = i - 1;
      }
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return { assignments, lastTailMatchedSrc, lastMatchedSrc };
}

interface CanonChapter {
  words: Array<{ norm: string; vg: VerseGroup }>;
}

function buildCanonChapters(verseGroups: VerseGroup[]): CanonChapter[] {
  const out: CanonChapter[] = [];
  let cur: CanonChapter | null = null;
  let curBook = "", curChapter = -1;
  for (const vg of verseGroups) {
    if (vg.book !== curBook || vg.chapter !== curChapter) {
      cur = { words: [] };
      out.push(cur);
      curBook = vg.book;
      curChapter = vg.chapter;
    }
    for (const w of vg.words) cur!.words.push({ norm: w.norm, vg });
  }
  return out;
}

function fillGaps(a: Int32Array, maxIdx: number): void {
  // Forward-fill -1s from matched anchors
  let cur = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== -1) cur = a[i];
    else a[i] = cur;
  }
  // Back-fill any leading zeros that were never set
  let first = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] > 0 || (a[i] === 0 && i > 0)) {
      first = a[i];
      break;
    }
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0 && i === 0) a[i] = first;
    else break;
  }
  // Clamp
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

  // Phase 1: segment source at chapter headings (hard anchors that reset drift)
  const segments = segmentSource(source, lineInfos);

  // Phase 2: group canonical verse groups by chapter
  const canonChapters = buildCanonChapters(verseGroups);

  // Build index: canonical book slug → first index in canonChapters
  const bookStart = new Map<string, number>();
  for (let i = 0; i < canonChapters.length; i++) {
    const b = canonChapters[i].words[0]?.vg.book;
    if (b && !bookStart.has(b)) bookStart.set(b, i);
  }

  // Expected source words per canonical word.
  const totalCanonWords = verseGroups.reduce((s, vg) => s + vg.words.length, 0);
  const srcPerCanon = totalCanonWords > 0
    ? source.length / totalCanonWords
    : 1.1;

  const result: CursorResult[] = new Array(source.length);
  let canonIdx = 0;

  // Precompute canonical limit for each segment: don't process past the book
  // that starts in the next book-heading segment. This prevents a segment from
  // consuming canonical chapters that belong to a different PM source segment.
  const segCanonLimits: number[] = segments.map(() => canonChapters.length);
  for (let si = 0; si < segments.length; si++) {
    for (let sj = si + 1; sj < segments.length; sj++) {
      if (!segments[sj].headingText) continue;
      const nextBook = headingToBook(segments[sj].headingText);
      if (nextBook !== null) {
        const nextStart = bookStart.get(nextBook);
        if (nextStart !== undefined) {
          segCanonLimits[si] = nextStart;
          break;
        }
      }
    }
  }

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.words.length === 0) continue;

    // When entering a book-heading segment, jump canonIdx to the matching book
    // (always — even backward — to correct any drift from prior segments).
    if (seg.headingText) {
      const targetBook = headingToBook(seg.headingText);
      if (targetBook !== null) {
        const jumpTo = bookStart.get(targetBook);
        if (jumpTo !== undefined && jumpTo > canonIdx) canonIdx = jumpTo;
      }
    }

    const canonLimit = segCanonLimits[si];
    let srcOffset = 0; // position within this segment

    while (srcOffset < seg.words.length && canonIdx < canonLimit) {
      const canon = canonChapters[canonIdx];
      if (canon.words.length === 0) {
        canonIdx++;
        continue;
      }

      const available = seg.words.slice(srcOffset);
      const windowSize = Math.min(
        available.length,
        Math.max(
          Math.round(canon.words.length * srcPerCanon * WINDOW_SLACK),
          WINDOW_MIN,
        ),
      );
      const window = available.slice(0, windowSize);

      const {
        assignments: rawAssignments,
        lastTailMatchedSrc,
        lastMatchedSrc,
      } = chapterLCS(window, canon.words);

      fillGaps(rawAssignments, canon.words.length - 1);

      const expectedConsume = Math.max(
        Math.round(canon.words.length * srcPerCanon * CONSUME_SLACK),
        CONSUME_MIN,
      );

      // Prefer the tail-anchored cut: the last source word matching the
      // chapter's final canonical words. This prevents common words later in
      // the source from dragging the boundary past the real chapter end.
      // Fall back to the global last match only when the tail produced nothing.
      const anchorSrc = lastTailMatchedSrc >= 0
        ? lastTailMatchedSrc
        : lastMatchedSrc;
      const consumeCount = anchorSrc >= 0
        ? Math.min(anchorSrc + 1, expectedConsume)
        : Math.min(expectedConsume, window.length);

      const srcBase = seg.startIdx + srcOffset;
      for (let k = 0; k < consumeCount; k++) {
        const idx = Math.min(rawAssignments[k], canon.words.length - 1);
        const { vg } = canon.words[idx];
        result[srcBase + k] = {
          ...window[k],
          assignedVerse: {
            book: vg.book,
            chapter: vg.chapter,
            verse: vg.verse,
          },
        };
      }

      srcOffset += consumeCount;
      canonIdx++;
    }
  }

  // Assign any remaining source words to the last known verse
  const lastVg = verseGroups[verseGroups.length - 1];
  let lastAssigned: CursorResult["assignedVerse"] = {
    book: lastVg.book,
    chapter: lastVg.chapter,
    verse: lastVg.verse,
  };
  for (let i = 0; i < source.length; i++) {
    if (!result[i]) result[i] = { ...source[i], assignedVerse: lastAssigned };
    else lastAssigned = result[i].assignedVerse;
  }

  return result;
}
