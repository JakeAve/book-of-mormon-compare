import { assertEquals } from "@std/assert";
import { segmentSource } from "./segment-source.ts";
import type { LineInfo, SourceWord } from "./types.ts";

/** Builds SourceWords + a LineInfo map from `{ text }` lines, one page per
 *  line (page numbers just need to be distinct and increasing). */
function buildSource(
  lines: string[],
): { words: SourceWord[]; lineInfos: Map<string, LineInfo> } {
  const words: SourceWord[] = [];
  const lineInfos = new Map<string, LineInfo>();
  lines.forEach((text, page) => {
    lineInfos.set(`${page}:1`, { page, line: 1, text });
    text.split(/\s+/).forEach((raw, wordIndexInLine) => {
      words.push({
        norm: raw.toLowerCase().replace(/[^a-z0-9]/g, ""),
        raw,
        page,
        line: 1,
        wordIndexInLine,
      });
    });
  });
  return { words, lineInfos };
}

Deno.test("segmentSource - book title immediately followed by CHAPTER I stays one segment", () => {
  const { words, lineInfos } = buildSource([
    "thus ended the days of Mosiah",
    "THE BOOK OF ALMA,",
    "THE SON OF ALMA.",
    "CHAPTER I.",
    "The account of Alma who was the son of Alma",
    "Now it came to pass that in the first year",
  ]);
  const segments = segmentSource(words, lineInfos);
  assertEquals(segments.length, 2);
  assertEquals(segments[1].headingText, "the book of alma");
});

Deno.test("segmentSource - unlabeled first chapter still splits at a real CHAPTER II", () => {
  const { words, lineInfos } = buildSource([
    "thus ended the days of Mosiah",
    "THE BOOK OF ALMA,",
    "THE SON OF ALMA.",
    "The account of Alma who was the son of Alma the first and chief judge",
    "over the people of Nephi and also the high priest over the church an",
    "account of the reign of the judges and the wars and contentions among",
    "the people and also an account of a war between the Nephites and the",
    "Lamanites according to the record of Alma the first and chief judge",
    "Now it came to pass that in the first year of the reign of the judges",
    "CHAPTER II.",
    "And it came to pass in the second year",
  ]);
  const segments = segmentSource(words, lineInfos);
  assertEquals(segments.length, 3);
  assertEquals(segments[1].headingText, "the book of alma");
  assertEquals(segments[2].headingText, "chapter ii");
});

Deno.test("segmentSource - bare book title (no recognized heading text) still merges with CHAPTER I", () => {
  // "BOOK OF MORMON." lacks the leading "the" the book-heading regexes
  // expect, so it's never itself recognized as a heading/boundary — but the
  // all-caps line right before "CHAPTER I" is still the signal we need.
  const { words, lineInfos } = buildSource([
    "and they were not believers, from the beginning",
    "BOOK OF MORMON.",
    "CHAPTER I.",
    "AND now I, Mormon, make a record of the things",
  ]);
  const segments = segmentSource(words, lineInfos);
  assertEquals(segments.length, 1);
});

Deno.test("segmentSource - allCapsBookTitles rejects a lowercase prose line that wraps into a book-title pattern", () => {
  // "And thus ended the book of Helaman ..." can line-wrap so that "the book
  // of Helaman" starts a line — prose, not a heading (1841 p493).
  const { words, lineInfos } = buildSource([
    "of the judges over the people of Nephi And thus ended",
    "the book of Helaman, according to the record of Hela-",
    "man and his sons.",
  ]);
  assertEquals(segmentSource(words, lineInfos).length, 2);
  assertEquals(
    segmentSource(words, lineInfos, { allCapsBookTitles: true }).length,
    1,
  );
});

Deno.test("segmentSource - allCapsBookTitles joins a multi-line title so the book resolves", () => {
  // 1841's 3 Nephi title spans three lines; the "son of Nephi" that
  // distinguishes it lives on the continuation lines.
  const { words, lineInfos } = buildSource([
    "who are of the house of Israel.",
    "THE BOOK OF NEPHI,",
    "THE SON OF NEPHI, WHO WAS THE SON",
    "OF HELAMAN.",
    "CHAPTER I.",
    "And Helaman was the son of Helaman",
  ]);
  const segments = segmentSource(words, lineInfos, {
    allCapsBookTitles: true,
  });
  assertEquals(segments.length, 2);
  assertEquals(
    segments[1].headingText,
    "the book of nephi the son of nephi who was the son of helaman",
  );
});

Deno.test("segmentSource - two unrelated chapter markers still split normally", () => {
  const { words, lineInfos } = buildSource([
    "thus ended the days of Mosiah",
    "CHAPTER I.",
    "And it came to pass",
    "CHAPTER II.",
    "And it came to pass again",
  ]);
  const segments = segmentSource(words, lineInfos);
  assertEquals(segments.length, 3);
  assertEquals(segments[1].headingText, "chapter i");
  assertEquals(segments[2].headingText, "chapter ii");
});
