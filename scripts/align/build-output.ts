import { buildTextToMdMapping } from "../shared/markdown.ts";
import { applyJoins, buildCanonIndex } from "../shared/stitch.ts";
import { lineKey, parseLineKey, verseKey } from "./line-key.ts";
import type { CursorResult, LineInfo } from "./types.ts";
import type { Override } from "./sources/types.ts";

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

  // Suffix letters: when one source line covers multiple verses, each verse's
  // slice gets an a/b/c suffix on its id so downstream tools can keep them
  // distinct.
  const lineVerseSuffix = buildLineVerseSuffixMap(allResults);

  const { verseOrder, byVerse } = groupByVerseKey(allResults);
  const outVerses: OutVerse[] = [];

  for (const vk of verseOrder) {
    const results = byVerse.get(vk)!;
    const { book, chapter, verse } = results[0].assignedVerse;
    const canonText = canonByKey.get(vk) ?? "";
    const lines = buildVerseLines(results, lineInfos, lineVerseSuffix, vk);
    applyJoins(lines, buildCanonIndex(canonText));
    outVerses.push({ book, chapter, verse, lines });
  }

  return outVerses;
}

function buildLineVerseSuffixMap(
  allResults: CursorResult[],
): Map<string, string> {
  const lineVerseSeen = new Map<string, Set<string>>();
  for (const r of allResults) {
    const lk = lineKey(r.page, r.line);
    const vk = verseKey(
      r.assignedVerse.book,
      r.assignedVerse.chapter,
      r.assignedVerse.verse,
    );
    let s = lineVerseSeen.get(lk);
    if (!s) {
      s = new Set();
      lineVerseSeen.set(lk, s);
    }
    s.add(vk);
  }

  const lineVerseSuffix = new Map<string, string>();
  const lineSuffixCounter = new Map<string, number>();
  const seenLV = new Set<string>();
  for (const r of allResults) {
    const lk = lineKey(r.page, r.line);
    const vk = verseKey(
      r.assignedVerse.book,
      r.assignedVerse.chapter,
      r.assignedVerse.verse,
    );
    const lvk = `${lk}:${vk}`;
    if (!seenLV.has(lvk) && (lineVerseSeen.get(lk)?.size ?? 1) > 1) {
      seenLV.add(lvk);
      const count = lineSuffixCounter.get(lk) ?? 0;
      lineVerseSuffix.set(lvk, String.fromCharCode(97 + count));
      lineSuffixCounter.set(lk, count + 1);
    }
  }
  return lineVerseSuffix;
}

function groupByVerseKey(
  allResults: CursorResult[],
): { verseOrder: string[]; byVerse: Map<string, CursorResult[]> } {
  const verseOrder: string[] = [];
  const byVerse = new Map<string, CursorResult[]>();
  for (const r of allResults) {
    const vk = verseKey(
      r.assignedVerse.book,
      r.assignedVerse.chapter,
      r.assignedVerse.verse,
    );
    let bucket = byVerse.get(vk);
    if (!bucket) {
      bucket = [];
      byVerse.set(vk, bucket);
      verseOrder.push(vk);
    }
    bucket.push(r);
  }
  return { verseOrder, byVerse };
}

function buildVerseLines(
  results: CursorResult[],
  lineInfos: Map<string, LineInfo>,
  lineVerseSuffix: Map<string, string>,
  vk: string,
): OutLine[] {
  const lineOrder: string[] = [];
  const byLine = new Map<string, CursorResult[]>();
  for (const r of results) {
    const lk = lineKey(r.page, r.line);
    let bucket = byLine.get(lk);
    if (!bucket) {
      bucket = [];
      byLine.set(lk, bucket);
      lineOrder.push(lk);
    }
    bucket.push(r);
  }

  const lines: OutLine[] = [];
  for (const lk of lineOrder) {
    const lineResults = byLine.get(lk)!;
    const info = lineInfos.get(lk);
    const { page, line } = parseLineKey(lk);
    const text = lineResults.map((r) => r.raw).join(" ");

    const markdown = info?.markdown
      ? sliceMarkdown(info, lineResults, text)
      : undefined;

    const suffix = lineVerseSuffix.get(`${lk}:${vk}`);
    const id = suffix ? `${page}:${line}${suffix}` : `${page}:${line}`;

    const outLine: OutLine = { id, page, line, text };
    if (markdown !== undefined) outLine.markdown = markdown;
    if (info?.source !== undefined) outLine.source = info.source;
    lines.push(outLine);
  }
  return lines;
}

/** Applies insertion overrides to already-built verse outputs. Each insertion
 *  adds a synthetic line (no page/line from source) into the target verse,
 *  either after a specified existing line or at the end of the verse. */
export function applyInsertions(
  verses: OutVerse[],
  overrides: Override[] | undefined,
): void {
  if (!overrides) return;
  const insertions = overrides.filter((o) => o.insertText !== undefined);
  if (insertions.length === 0) return;

  const byVk = new Map(
    verses.map((v) => [verseKey(v.book, v.chapter, v.verse), v]),
  );

  for (const ins of insertions) {
    const vk = verseKey(
      ins.target.book,
      ins.target.chapter,
      ins.target.verse,
    );
    const verse = byVk.get(vk);
    if (!verse) {
      console.warn(
        `  insertion override did not find verse: ${vk} (${ins.note})`,
      );
      continue;
    }

    const syntheticId =
      `ins:${ins.target.book}-${ins.target.chapter}-${ins.target.verse}`;
    const newLine: OutLine = {
      id: syntheticId,
      page: 0,
      line: 0,
      text: ins.insertText!,
      ...(ins.insertMarkdown !== undefined
        ? { markdown: ins.insertMarkdown }
        : {}),
    };

    if (ins.insertAfterLine) {
      const afterPage = ins.insertAfterLine.page;
      const afterLine = ins.insertAfterLine.line;
      const idx = verse.lines.findIndex(
        (l) => l.page === afterPage && l.line === afterLine,
      );
      if (idx === -1) {
        console.warn(
          `  insertion override: insertAfterLine p${afterPage}:${afterLine} not found in ${vk}, appending`,
        );
        verse.lines.push(newLine);
      } else {
        verse.lines.splice(idx + 1, 0, newLine);
      }
    } else {
      verse.lines.push(newLine);
    }
  }
}

function sliceMarkdown(
  info: LineInfo,
  lineResults: CursorResult[],
  text: string,
): string | undefined {
  const allTextWords = info.text.split(/\s+/).filter((w) => w.length > 0);
  const allMdWords = info.markdown!.split(/\s+/).filter((w) => w.length > 0);
  let minIdx = lineResults[0].wordIndexInLine;
  let maxIdx = minIdx;
  for (let i = 1; i < lineResults.length; i++) {
    const idx = lineResults[i].wordIndexInLine;
    if (idx < minIdx) minIdx = idx;
    if (idx > maxIdx) maxIdx = idx;
  }
  const mapping = buildTextToMdMapping(allTextWords, allMdWords);
  const mdStart = mapping[minIdx] ?? 0;
  const mdEnd = mapping[maxIdx + 1] ?? allMdWords.length;
  const mdSlice = allMdWords.slice(mdStart, mdEnd).join(" ");
  return mdSlice && mdSlice !== text ? mdSlice : undefined;
}
