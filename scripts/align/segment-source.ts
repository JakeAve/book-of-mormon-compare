import { isChapterHeading, normalizeHeading } from "./headings.ts";
import { lineKey } from "./line-key.ts";
import type { LineInfo, SourceWord } from "./types.ts";

export interface SourceSegment {
  words: SourceWord[];
  /** Index of first word in the original source array. */
  startIdx: number;
  /** Normalized heading text that starts this segment (empty for segment 0). */
  headingText: string;
}

export interface SegmentOptions {
  /** Printed-edition convention: book titles are typeset entirely in
   *  capitals. When set, a lowercase line matching a book-title pattern is
   *  rejected as prose (a sentence like "and thus ended the book of Helaman"
   *  can line-wrap so "the book of Helaman" starts a line), and a title
   *  spanning several all-caps lines is joined before book resolution (e.g.
   *  "THE BOOK OF NEPHI," / "THE SON OF NEPHI, ..." — the 3/4 Nephi
   *  distinction lives on the continuation lines). */
  allCapsBookTitles?: boolean;
}

/** True when a line is typeset entirely in capitals — the convention these
 *  editions use for book titles and chapter markers, never for prose (a
 *  verse's first word is often capitalized, but the rest of the line isn't). */
function isAllCapsLine(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

// A book-title heading (e.g. "THE BOOK OF ALMA") is sometimes immediately
// followed by its own explicit "CHAPTER I" marker for that book's first
// chapter (1840 does this; 1830/1837 don't — they run straight into prose).
// Both describe the same canonical verse 0, so they must stay in one
// segment: splitting them lets the tiny book-title fragment get fully
// cursor-consumed on its own, leaving the "CHAPTER I" segment to start
// mid-verse with no book jump to anchor it. Detected by looking at the line
// immediately before the marker rather than matching the title text itself,
// since some titles span multiple lines or lack the "the" the book-heading
// patterns expect (e.g. 1840's bare "BOOK OF MORMON.") — but title lines are
// always all-caps, while the tail of a real preceding chapter never is.
function isFirstChapterMarker(heading: string): boolean {
  return /^chapter\s+(i|1)$/.test(heading);
}

// Extend a book-title heading with the all-caps lines that continue it,
// stopping at the first prose or "CHAPTER ..." line. Only used under
// `allCapsBookTitles`, where the convention makes continuation lines
// unambiguous.
function joinTitleContinuationLines(
  heading: string,
  source: SourceWord[],
  startIdx: number,
  lineInfos: Map<string, LineInfo>,
): string {
  const startKey = lineKey(source[startIdx].page, source[startIdx].line);
  let currentKey = startKey;
  let joined = heading;
  for (let j = startIdx + 1; j < source.length; j++) {
    const lk = lineKey(source[j].page, source[j].line);
    if (lk === currentKey) continue;
    currentKey = lk;
    const info = lineInfos.get(lk);
    if (!info || !isAllCapsLine(info.text)) break;
    const normalized = normalizeHeading(info.text);
    if (/^chapter\b/.test(normalized)) break;
    joined = `${joined} ${normalized}`;
  }
  return joined;
}

export function segmentSource(
  source: SourceWord[],
  lineInfos: Map<string, LineInfo>,
  options: SegmentOptions = {},
): SourceSegment[] {
  const boundaries: Array<{ idx: number; heading: string }> = [
    { idx: 0, heading: "" },
  ];
  let prevLineKey = "";
  for (let i = 0; i < source.length; i++) {
    const lk = lineKey(source[i].page, source[i].line);
    if (lk !== prevLineKey) {
      prevLineKey = lk;
      const info = lineInfos.get(lk);
      if (info && isChapterHeading(info.text) && i > 0) {
        let heading = normalizeHeading(info.text);
        const isBookTitle = !/^chapter\b/.test(heading);
        if (options.allCapsBookTitles && isBookTitle) {
          if (!isAllCapsLine(info.text)) continue;
          heading = joinTitleContinuationLines(heading, source, i, lineInfos);
        }
        if (isFirstChapterMarker(heading)) {
          const prevWord = source[i - 1];
          const prevInfo = lineInfos.get(
            lineKey(prevWord.page, prevWord.line),
          );
          if (prevInfo && isAllCapsLine(prevInfo.text)) continue;
        }
        boundaries.push({ idx: i, heading });
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
