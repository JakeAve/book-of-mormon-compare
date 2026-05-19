import {
  getBookDisplayName,
  getVersionDisplayName,
  VERSION_SHORT_NAMES,
} from "./data.ts";
import type { Verse } from "./data.ts";
import { diff } from "./diff.ts";
import { insertSpaceBetween } from "./textHelpers.ts";

export const OG_VERSE_PREVIEW_CHARS = 450;
const CHARS_PER_LINE = 43;
const MAX_VERSE_LINES = 8;
export const LINE_HEIGHT = 44;
const VERSE_NUM_FIRST_LINE_PENALTY = 3;
const VERSE_NUM_FONT_SIZE = 27;

export function buildVersePreviewText(
  verses: Verse[],
  markedVerses: Set<number>,
): string {
  const sorted = [...markedVerses].sort((a, b) => a - b);
  let result = "";
  for (const verseNum of sorted) {
    const verse = verses.find((v) => v.verse === verseNum);
    if (!verse) continue;
    result = result === "" ? verse.text : `${result} ${verseNum} ${verse.text}`;
    if (result.length >= OG_VERSE_PREVIEW_CHARS) {
      return result.slice(0, OG_VERSE_PREVIEW_CHARS) + "…";
    }
  }
  return result;
}

export function wrapVerseLines(
  verseNumber: number,
  text: string,
  maxCharsPerLine: number = CHARS_PER_LINE,
): string[] {
  const firstLineMax = verseNumber > 0
    ? maxCharsPerLine - VERSE_NUM_FIRST_LINE_PENALTY
    : maxCharsPerLine;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  let isFirst = true;

  for (const word of words) {
    const max = isFirst ? firstLineMax : maxCharsPerLine;
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= max) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
      isFirst = false;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface OgImageParams {
  book: string;
  chapter: string;
  v1: string;
  v2: string;
  verseNumber?: number;
  verse1Text?: string;
  verse2Text?: string;
  inlineVerseNums?: number[];
}

function getShortVersionName(version: string): string {
  return VERSION_SHORT_NAMES[version] ?? getVersionDisplayName(version);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const DIFF_HIGHLIGHT_COLOR = "#E8A030";

interface ColoredSegment {
  text: string;
  space: string;
  highlighted: boolean;
  verseMarker?: boolean;
}

function buildColoredSegments(
  verse1Text: string,
  verse2Text: string,
  isV1: boolean,
  inlineVerseNums?: number[],
): ColoredSegment[] {
  const tokens = diff(verse1Text, verse2Text);
  const sideTokens = tokens.filter((t) => isV1 ? !t.added : !t.removed);
  const markerIndices = new Set<number>();
  if (inlineVerseNums) {
    for (const n of inlineVerseNums) {
      const idx = sideTokens.findIndex((t) => t.value === String(n));
      if (idx !== -1) markerIndices.add(idx);
    }
  }
  return sideTokens.map((t, i) => ({
    text: t.value,
    space: i === 0
      ? ""
      : markerIndices.has(i)
      ? " "
      : (insertSpaceBetween(sideTokens[i - 1].value, t.value) ?? ""),
    highlighted: !markerIndices.has(i) &&
      (isV1 ? t.removed === true : t.added === true),
    verseMarker: markerIndices.has(i) || undefined,
  }));
}

function wrapColoredSegments(
  segments: ColoredSegment[],
  verseNumber: number,
): ColoredSegment[][] {
  const firstLineMax = verseNumber > 0
    ? CHARS_PER_LINE - VERSE_NUM_FIRST_LINE_PENALTY
    : CHARS_PER_LINE;
  const lines: ColoredSegment[][] = [];
  let currentLine: ColoredSegment[] = [];
  let lineLength = 0;
  let isFirst = true;

  for (const seg of segments) {
    const segLen = seg.space.length + seg.text.length;
    const max = isFirst ? firstLineMax : CHARS_PER_LINE;
    if (lineLength === 0 || lineLength + segLen <= max) {
      currentLine.push(seg);
      lineLength += segLen;
    } else {
      lines.push(currentLine);
      currentLine = [{ ...seg, space: "" }];
      lineLength = seg.text.length;
      isFirst = false;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines.slice(0, MAX_VERSE_LINES);
}

function buildVerseTextSvgBlock(
  x: number,
  startY: number,
  verseNumber: number,
  lines: ColoredSegment[][],
): string {
  let result =
    `<text font-family="Cormorant Garamond, serif" font-size="27" fill="#E8E0D0">`;

  lines.forEach((line, lineIdx) => {
    // Merge consecutive same-color segments into runs for clean SVG output
    const runs: {
      text: string;
      highlighted: boolean;
      verseMarker?: boolean;
    }[] = [];
    for (const seg of line) {
      const segText = seg.space + seg.text;
      const last = runs[runs.length - 1];
      const sameKind = last &&
        last.highlighted === seg.highlighted &&
        !!last.verseMarker === !!seg.verseMarker;
      if (sameKind) {
        last.text += segText;
      } else {
        runs.push({
          text: segText,
          highlighted: seg.highlighted,
          verseMarker: seg.verseMarker,
        });
      }
    }

    runs.forEach((run, runIdx) => {
      const attrs = run.verseMarker
        ? ` font-size="${VERSE_NUM_FONT_SIZE}" fill="#F4F0E8"`
        : run.highlighted
        ? ` fill="${DIFF_HIGHLIGHT_COLOR}"`
        : "";
      const escaped = run.verseMarker
        ? `[${escapeXml(run.text.trim())}]`
        : escapeXml(run.text);
      if (lineIdx === 0 && runIdx === 0) {
        const numY = startY - 8;
        result +=
          `<tspan x="${x}" y="${numY}" font-size="${VERSE_NUM_FONT_SIZE}" fill="#F4F0E8">[${verseNumber}]</tspan>` +
          `<tspan y="${startY}" dx="6"${attrs}>${escaped}</tspan>`;
      } else if (lineIdx > 0 && runIdx === 0) {
        result +=
          `<tspan x="${x}" dy="${LINE_HEIGHT}"${attrs}>${escaped}</tspan>`;
      } else {
        const dx = run.verseMarker ? ` dx="5"` : "";
        result += `<tspan${attrs}${dx}>${escaped}</tspan>`;
      }
    });
  });

  result += `</text>`;
  return result;
}

function buildVersePreviewSvg(params: OgImageParams): string {
  const {
    book,
    chapter,
    v1,
    v2,
    verseNumber,
    verse1Text,
    verse2Text,
    inlineVerseNums,
  } = params;
  const bookName = escapeXml(getBookDisplayName(book));
  const v1Name = escapeXml(getShortVersionName(v1));
  const v2Name = escapeXml(getShortVersionName(v2));
  const chapterEsc = escapeXml(chapter);
  const showChapter = book !== "title-page" && book !== "witnesses";
  const chapterLabel = showChapter
    ? `${bookName}  |  Chapter ${chapterEsc}`
    : bookName;

  const segs1 = buildColoredSegments(
    verse1Text!,
    verse2Text!,
    true,
    inlineVerseNums,
  );
  const segs2 = buildColoredSegments(
    verse1Text!,
    verse2Text!,
    false,
    inlineVerseNums,
  );
  const lines1 = wrapColoredSegments(segs1, verseNumber!);
  const lines2 = wrapColoredSegments(segs2, verseNumber!);
  const leftBlock = buildVerseTextSvgBlock(52, 240, verseNumber!, lines1);
  const rightBlock = buildVerseTextSvgBlock(624, 240, verseNumber!, lines2);

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1C1C1C"/>
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#E8E0D0" stroke-width="1.5"/>
  <path d="M28 80 L28 28 L80 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 80 L1172 28 L1120 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M28 550 L28 602 L80 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 550 L1172 602 L1120 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <text x="600" y="90" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="18" fill="#BBBBBB" letter-spacing="5">BOOK OF MORMON COMPARE</text>
  <line x1="520" y1="108" x2="680" y2="108" stroke="#C48A4A" stroke-width="2"/>
  <text x="600" y="150" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="27" fill="#F4F0E8" letter-spacing="1">${chapterLabel}</text>
  <text x="52" y="192" font-family="Cormorant Garamond, serif" font-size="21" fill="#C48A4A" letter-spacing="2">${v1Name}</text>
  <text x="624" y="192" font-family="Cormorant Garamond, serif" font-size="21" fill="#C48A4A" letter-spacing="2">${v2Name}</text>
  <line x1="600" y1="165" x2="600" y2="572" stroke="#555555" stroke-width="1"/>
  ${leftBlock}
  ${rightBlock}
  <text x="600" y="592" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="15" fill="#888888" letter-spacing="2">SIDE-BY-SIDE TEXTUAL COMPARISON</text>
</svg>`;
}

export function buildOgImageSvg(params: OgImageParams): string {
  if (
    params.verseNumber !== undefined &&
    params.verse1Text !== undefined &&
    params.verse2Text !== undefined
  ) {
    return buildVersePreviewSvg(params);
  }
  const { book, chapter, v1, v2 } = params;
  const bookName = escapeXml(getBookDisplayName(book));
  const v1Name = escapeXml(getShortVersionName(v1));
  const v2Name = escapeXml(getShortVersionName(v2));
  const chapterEsc = escapeXml(chapter);
  const showChapter = book !== "title-page" && book !== "witnesses";

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1C1C1C"/>
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#E8E0D0" stroke-width="1.5"/>
  <path d="M28 80 L28 28 L80 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 80 L1172 28 L1120 28" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M28 550 L28 602 L80 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <path d="M1172 550 L1172 602 L1120 602" stroke="#C48A4A" stroke-width="3" fill="none"/>
  <text x="600" y="160" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="28" fill="#BBBBBB" letter-spacing="5">BOOK OF MORMON COMPARE</text>
  <line x1="520" y1="188" x2="680" y2="188" stroke="#C48A4A" stroke-width="2"/>
  <text x="600" y="338" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="96" fill="#F4F0E8">${
    showChapter ? `${bookName}  |  Chapter ${chapterEsc}` : bookName
  }</text>
  <text x="300" y="455" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="42" fill="#C48A4A">${v1Name}</text>
  <text x="600" y="455" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="34" fill="#AAAAAA">vs</text>
  <text x="900" y="455" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="42" fill="#C48A4A">${v2Name}</text>
  <text x="600" y="525" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="26" fill="#AAAAAA" letter-spacing="4">SIDE-BY-SIDE TEXTUAL COMPARISON</text>
</svg>`;
}
