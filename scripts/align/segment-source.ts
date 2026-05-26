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
        boundaries.push({ idx: i, heading: normalizeHeading(info.text) });
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
