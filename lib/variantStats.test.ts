import { assertEquals } from "@std/assert";
import {
  bookIntroSentences,
  chapterDescription,
  chapterSummarySentence,
  chapterTitle,
  type ChapterVariantStats,
  isCanonicalPair,
  loadVariantStats,
} from "./variantStats.ts";

const alma5: ChapterVariantStats = {
  book: "alma",
  chapter: 5,
  variantCount: 37,
  changedVerseCount: 22,
  totalVerseCount: 62,
};

const enos1: ChapterVariantStats = {
  book: "enos",
  chapter: 1,
  variantCount: 1,
  changedVerseCount: 1,
  totalVerseCount: 27,
};

const clean: ChapterVariantStats = {
  book: "jarom",
  chapter: 1,
  variantCount: 0,
  changedVerseCount: 0,
  totalVerseCount: 15,
};

Deno.test("isCanonicalPair only accepts pm vs 2013", () => {
  assertEquals(isCanonicalPair("pm", "2013"), true);
  assertEquals(isCanonicalPair("om", "2013"), false);
  assertEquals(isCanonicalPair("2013", "pm"), false);
});

Deno.test("chapterTitle names the count", () => {
  assertEquals(
    chapterTitle(alma5, "Alma"),
    "Alma 5 — 37 Textual Differences | Book of Mormon Compare",
  );
});

Deno.test("chapterTitle uses the singular for one difference", () => {
  assertEquals(
    chapterTitle(enos1, "Enos"),
    "Enos 1 — 1 Textual Difference | Book of Mormon Compare",
  );
});

Deno.test("chapterTitle states zero plainly", () => {
  assertEquals(
    chapterTitle(clean, "Jarom"),
    "Jarom 1 — No Textual Differences | Book of Mormon Compare",
  );
});

Deno.test("chapterTitle drops the site suffix when over 60 characters", () => {
  const wOfM: ChapterVariantStats = { ...alma5, book: "w-of-m", chapter: 1 };
  assertEquals(
    chapterTitle(wOfM, "Words of Mormon"),
    "Words of Mormon 1 — 37 Textual Differences",
  );
});

Deno.test("chapterDescription names counts and both witnesses, within 155 chars", () => {
  const description = chapterDescription(alma5, "Alma");
  assertEquals(
    description,
    "Alma 5 has 37 textual differences across 22 of 62 verses between the Printer's Manuscript and the 2013 Edition. Compare both witnesses word by word.",
  );
  assertEquals(description.length <= 155, true);
});

Deno.test("chapterDescription keeps the tag line when it fits", () => {
  const description = chapterDescription(alma5, "Alma");
  assertEquals(
    description.endsWith("Compare both witnesses word by word."),
    true,
  );
});

Deno.test("chapterDescription drops the tag line rather than truncate a sentence (witnesses/1-shaped)", () => {
  const witnesses1: ChapterVariantStats = {
    book: "witnesses",
    chapter: 1,
    variantCount: 98,
    changedVerseCount: 15,
    totalVerseCount: 15,
  };
  const description = chapterDescription(witnesses1, "Witness Testimonies");
  assertEquals(description.length <= 155, true);
  assertEquals(description.endsWith("."), true);
});

Deno.test("chapterDescription drops the tag line rather than truncate a sentence (w-of-m/1-shaped)", () => {
  const wOfM1: ChapterVariantStats = {
    book: "w-of-m",
    chapter: 1,
    variantCount: 167,
    changedVerseCount: 19,
    totalVerseCount: 19,
  };
  const description = chapterDescription(wOfM1, "Words of Mormon");
  assertEquals(description.length <= 155, true);
  assertEquals(description.endsWith("."), true);
});

Deno.test("chapterDescription states zero plainly", () => {
  assertEquals(
    chapterDescription(clean, "Jarom"),
    "Jarom 1 has no textual differences between the Printer's Manuscript and the 2013 Edition across its 15 verses. Compare both witnesses word by word.",
  );
});

Deno.test("chapterSummarySentence reads as prose", () => {
  assertEquals(
    chapterSummarySentence(alma5),
    "37 differences across 22 verses between the Printer's Manuscript and the 2013 Edition.",
  );
  assertEquals(
    chapterSummarySentence(enos1),
    "1 difference in 1 verse between the Printer's Manuscript and the 2013 Edition.",
  );
  assertEquals(
    chapterSummarySentence(clean),
    "No textual differences between the Printer's Manuscript and the 2013 Edition in this chapter.",
  );
});

Deno.test("bookIntroSentences derives book-specific facts from its own stats", () => {
  const chapters: ChapterVariantStats[] = [
    {
      book: "enos",
      chapter: 1,
      variantCount: 4,
      changedVerseCount: 3,
      totalVerseCount: 27,
    },
    {
      book: "enos",
      chapter: 2,
      variantCount: 9,
      changedVerseCount: 6,
      totalVerseCount: 30,
    },
  ];
  assertEquals(bookIntroSentences("Enos", chapters), [
    "Enos carries 13 textual differences across 2 chapters when the Printer's Manuscript is set against the 2013 Edition.",
    "9 of those fall in chapter 2, the most varied chapter in the book; 9 of its 57 verses differ in total.",
  ]);
});

Deno.test("bookIntroSentences states a variant-free book plainly", () => {
  const chapters: ChapterVariantStats[] = [
    {
      book: "jarom",
      chapter: 1,
      variantCount: 0,
      changedVerseCount: 0,
      totalVerseCount: 15,
    },
  ];
  assertEquals(bookIntroSentences("Jarom", chapters), [
    "Jarom carries no textual differences across 1 chapter when the Printer's Manuscript is set against the 2013 Edition.",
    "All 15 of its verses read identically in both witnesses.",
  ]);
});

Deno.test("loadVariantStats degrades to empty when the file is missing", async () => {
  const stats = await loadVariantStats("data/stats/does-not-exist.json");
  assertEquals(stats.forChapter("alma", 5), null);
  assertEquals(stats.forBook("alma"), []);
});

Deno.test("loadVariantStats reads the committed file", async () => {
  const stats = await loadVariantStats();
  const alma = stats.forBook("alma");
  assertEquals(alma.length > 0, true);
  assertEquals(stats.forChapter("alma", "5")?.book, "alma");
  assertEquals(stats.forChapter("alma", 5)?.chapter, 5);
  assertEquals(stats.forChapter("no-such-book", 1), null);
});
