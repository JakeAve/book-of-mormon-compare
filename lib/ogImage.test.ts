import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  buildOgImageSvg,
  buildVersePreviewText,
  DIFF_HIGHLIGHT_COLOR,
  OG_VERSE_PREVIEW_CHARS,
  wrapVerseLines,
} from "./ogImage.ts";
import type { Verse } from "./data.ts";

function makeVerse(verse: number, text: string): Verse {
  return { chapter: 1, verse, text };
}

Deno.test("buildOgImageSvg returns valid SVG string", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "<svg");
  assertStringIncludes(svg, "</svg>");
  assertStringIncludes(svg, 'width="1200"');
  assertStringIncludes(svg, 'height="630"');
});

Deno.test("buildOgImageSvg includes book display name", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "1 Nephi");
});

Deno.test("buildOgImageSvg includes chapter number", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "Chapter 3");
});

Deno.test("buildOgImageSvg includes short version names", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "Printer&#39;s Manuscript");
  assertStringIncludes(svg, "2013 Edition");
});

Deno.test("buildOgImageSvg escapes XML in unknown version", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "1",
    v1: "<evil>",
    v2: "2013",
  });
  assertEquals(svg.includes("<evil>"), false);
  assertStringIncludes(svg, "&lt;evil&gt;");
});

Deno.test("buildOgImageSvg omits chapter for title-page", () => {
  const svg = buildOgImageSvg({
    book: "title-page",
    chapter: "1",
    v1: "pm",
    v2: "2013",
  });
  assertEquals(svg.includes("Chapter"), false);
  assertStringIncludes(svg, "Title Page");
});

Deno.test("buildOgImageSvg omits chapter for witnesses", () => {
  const svg = buildOgImageSvg({
    book: "witnesses",
    chapter: "1",
    v1: "pm",
    v2: "2013",
  });
  assertEquals(svg.includes("Chapter"), false);
  assertStringIncludes(svg, "Witness");
});

Deno.test("buildOgImageSvg handles unknown book gracefully", () => {
  const svg = buildOgImageSvg({
    book: "unknown-book",
    chapter: "1",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, "unknown-book");
});

Deno.test("buildVersePreviewText returns verse text truncated to limit", () => {
  const long = "a".repeat(OG_VERSE_PREVIEW_CHARS + 50);
  const verses = [makeVerse(1, long)];
  const result = buildVersePreviewText(verses, new Set([1]));
  assertEquals(result, "a".repeat(OG_VERSE_PREVIEW_CHARS) + "…");
});

Deno.test("buildVersePreviewText returns empty string when verse not found", () => {
  const verses = [makeVerse(1, "text")];
  assertEquals(buildVersePreviewText(verses, new Set([99])), "");
});

Deno.test("buildVersePreviewText returns verse text unchanged when single mark", () => {
  const short = "short verse";
  const verses = [makeVerse(1, short), makeVerse(2, "next verse text")];
  assertEquals(buildVersePreviewText(verses, new Set([1])), short);
});

Deno.test("buildVersePreviewText concatenates multiple marked verses", () => {
  const verses = [makeVerse(1, "verse one"), makeVerse(2, "verse two")];
  const result = buildVersePreviewText(verses, new Set([1, 2]));
  assertEquals(result, "verse one 2 verse two");
});

Deno.test("buildVersePreviewText truncates concatenated verses to limit", () => {
  const long = "b".repeat(OG_VERSE_PREVIEW_CHARS);
  const verses = [makeVerse(1, "short"), makeVerse(2, long)];
  const result = buildVersePreviewText(verses, new Set([1, 2]));
  assertEquals(result.endsWith("…"), true);
  assertEquals(result.slice(0, -1).length <= OG_VERSE_PREVIEW_CHARS, true);
});

Deno.test("buildVersePreviewText skips missing verses in marks", () => {
  const verses = [makeVerse(1, "verse one"), makeVerse(3, "verse three")];
  const result = buildVersePreviewText(verses, new Set([1, 2, 3]));
  assertEquals(result.includes("verse one"), true);
  assertEquals(result.includes("verse three"), true);
});

Deno.test("wrapVerseLines splits text into lines respecting max chars", () => {
  const lines = wrapVerseLines(
    1,
    "one two three four five six seven eight",
    20,
  );
  for (const line of lines.slice(1)) {
    assertEquals(line.length <= 20, true);
  }
});

Deno.test("wrapVerseLines first line is shorter to account for verse number", () => {
  const text = "word1 word2 word3 word4 word5 word6 word7";
  const allLines = wrapVerseLines(1, text, 20);
  const noNumLines = wrapVerseLines(0, text, 20);
  assertEquals(allLines[0].length <= 17, true);
  assertEquals(noNumLines[0].length <= 20, true);
});

Deno.test("buildOgImageSvg renders verse preview when verse fields present", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "1",
    v1: "pm",
    v2: "2013",
    verseNumber: 1,
    verse1Text: "I Nephi having been born of goodly parents",
    verse2Text: "I, Nephi, having been born of goodly parents,",
  });
  // v1 has no commas — contiguous run in one tspan
  assertStringIncludes(svg, "I Nephi having been born");
  // "having been born of goodly" is shared text — always a contiguous run
  assertStringIncludes(svg, "having been born of goodly");
  // v2's extra commas are highlighted — verify diff coloring fires
  assertStringIncludes(svg, `fill="${DIFF_HIGHLIGHT_COLOR}">`);
  assertStringIncludes(svg, ">[1]<");
});

Deno.test("buildOgImageSvg verse preview includes version labels", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "1",
    v1: "pm",
    v2: "2013",
    verseNumber: 2,
    verse1Text: "verse one text",
    verse2Text: "verse two text",
  });
  assertStringIncludes(svg, "Printer");
  assertStringIncludes(svg, "2013");
});

Deno.test("buildOgImageSvg verse preview includes center divider line", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "1",
    v1: "pm",
    v2: "2013",
    verseNumber: 1,
    verse1Text: "text",
    verse2Text: "text",
  });
  assertStringIncludes(svg, 'x1="600"');
  assertStringIncludes(svg, 'x2="600"');
});

Deno.test("buildOgImageSvg falls back to generic layout when verse fields absent", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "3",
    v1: "pm",
    v2: "2013",
  });
  assertStringIncludes(svg, 'font-size="96"');
});

Deno.test("buildOgImageSvg escapes XML in verse text", () => {
  const svg = buildOgImageSvg({
    book: "1-ne",
    chapter: "1",
    v1: "pm",
    v2: "2013",
    verseNumber: 1,
    verse1Text: "<evil> & 'quote'",
    verse2Text: "safe text",
  });
  assertEquals(svg.includes("<evil>"), false);
  assertStringIncludes(svg, "&lt;evil&gt;");
  assertStringIncludes(svg, "&amp;");
});
