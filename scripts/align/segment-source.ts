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

export function segmentSource(
  source: SourceWord[],
  lineInfos: Map<string, LineInfo>,
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
        const heading = normalizeHeading(info.text);
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
