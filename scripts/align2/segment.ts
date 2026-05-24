import { buildTextToMdMapping } from "../align/markdown.ts";
import { applyJoins, buildCanonIndex } from "../align/stitch.ts";
import type { CursorResult, LineInfo } from "./types.ts";

export interface OutLine {
  id: string;
  page: number;
  line: number;
  text: string;
  markdown?: string;
  source?: string;
}

export interface OutVerse {
  book: string;
  chapter: number;
  verse: number;
  lines: OutLine[];
}

export function buildAllVerseOutputs(
  allResults: CursorResult[],
  lineInfos: Map<string, LineInfo>,
  canonByKey: Map<string, string>,
): OutVerse[] {
  if (allResults.length === 0) return [];

  // Count how many distinct verses each source line contributes to
  const lineVerseSeen = new Map<string, Set<string>>();
  for (const r of allResults) {
    const lk = `${r.page}:${r.line}`;
    const vk =
      `${r.assignedVerse.book}|${r.assignedVerse.chapter}|${r.assignedVerse.verse}`;
    if (!lineVerseSeen.has(lk)) lineVerseSeen.set(lk, new Set());
    lineVerseSeen.get(lk)!.add(vk);
  }
  const lineVerseCount = new Map<string, number>();
  for (const [lk, vks] of lineVerseSeen) {
    lineVerseCount.set(lk, vks.size);
  }

  // Assign suffix letters per line per verse (in order of first encounter)
  const lineVerseSuffix = new Map<string, string>(); // key: `${lk}:${vk}`
  const lineSuffixCounter = new Map<string, number>();

  // Walk in order to assign suffixes in encounter order
  const seenLV = new Set<string>();
  for (const r of allResults) {
    const lk = `${r.page}:${r.line}`;
    const vk =
      `${r.assignedVerse.book}|${r.assignedVerse.chapter}|${r.assignedVerse.verse}`;
    const lvk = `${lk}:${vk}`;
    if (!seenLV.has(lvk) && (lineVerseCount.get(lk) ?? 1) > 1) {
      seenLV.add(lvk);
      const count = lineSuffixCounter.get(lk) ?? 0;
      lineVerseSuffix.set(lvk, String.fromCharCode(97 + count));
      lineSuffixCounter.set(lk, count + 1);
    }
  }

  // Group results by verse key (preserving encounter order)
  const verseOrder: string[] = [];
  const byVerse = new Map<string, CursorResult[]>();
  for (const r of allResults) {
    const vk =
      `${r.assignedVerse.book}|${r.assignedVerse.chapter}|${r.assignedVerse.verse}`;
    if (!byVerse.has(vk)) {
      byVerse.set(vk, []);
      verseOrder.push(vk);
    }
    byVerse.get(vk)!.push(r);
  }

  const outVerses: OutVerse[] = [];

  for (const vk of verseOrder) {
    const results = byVerse.get(vk)!;
    const { book, chapter, verse } = results[0].assignedVerse;
    const canonText = canonByKey.get(vk) ?? "";

    // Group results by source line (preserving encounter order)
    const lineOrder: string[] = [];
    const byLine = new Map<string, CursorResult[]>();
    for (const r of results) {
      const lk = `${r.page}:${r.line}`;
      if (!byLine.has(lk)) {
        byLine.set(lk, []);
        lineOrder.push(lk);
      }
      byLine.get(lk)!.push(r);
    }

    const lines: OutLine[] = [];
    for (const lk of lineOrder) {
      const lineResults = byLine.get(lk)!;
      const info = lineInfos.get(lk);
      const [page, line] = lk.split(":").map(Number);

      // Reconstruct text from raw words in order
      const text = lineResults.map((r) => r.raw).join(" ");

      // Reconstruct markdown slice if line has markdown
      let markdown: string | undefined;
      if (info?.markdown) {
        const allTextWords = info.text.split(/\s+/).filter((w) => w.length > 0);
        const allMdWords = info.markdown.split(/\s+/).filter((w) =>
          w.length > 0
        );
        const minIdx = Math.min(...lineResults.map((r) => r.wordIndexInLine));
        const maxIdx = Math.max(...lineResults.map((r) => r.wordIndexInLine));
        const mapping = buildTextToMdMapping(allTextWords, allMdWords);
        const mdStart = mapping[minIdx] ?? 0;
        const mdEnd = mapping[maxIdx + 1] ?? allMdWords.length;
        const mdSlice = allMdWords.slice(mdStart, mdEnd).join(" ");
        if (mdSlice && mdSlice !== text) markdown = mdSlice;
      }

      const lvk = `${lk}:${vk}`;
      const suffix = lineVerseSuffix.get(lvk);
      const id = suffix ? `${page}:${line}${suffix}` : `${page}:${line}`;

      lines.push({ id, page, line, text, markdown, source: info?.source });
    }

    applyJoins(lines, buildCanonIndex(canonText));
    outVerses.push({ book, chapter, verse, lines });
  }

  return outVerses;
}
