import { assertEquals } from "@std/assert";
import {
  bookDescription,
  bookHubTitle,
  bookIntroSentences,
  chapterDescription,
  chapterSummarySentence,
  chapterTitle,
  type ChapterVariantStats,
  isCanonicalPair,
  loadVariantStats,
} from "./variantStats.ts";
import { BOOK_ORDER, getBookDisplayName } from "./data.ts";
import { CHAPTERLESS_BOOKS } from "./bookChapters.ts";

const alma5: ChapterVariantStats = {
  book: "alma",
  chapter: 5,
  variantCount: 581,
  changedVerseCount: 63,
  totalVerseCount: 63,
};

const enos1: ChapterVariantStats = {
  book: "enos",
  chapter: 1,
  variantCount: 1,
  changedVerseCount: 1,
  totalVerseCount: 1,
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
    "Alma 5 — 581 Textual Variants | Book of Mormon Compare",
  );
});

Deno.test("chapterTitle uses the singular for one variant", () => {
  assertEquals(
    chapterTitle(enos1, "Enos"),
    "Enos 1 — 1 Textual Variant | Book of Mormon Compare",
  );
});

Deno.test("chapterTitle states zero plainly", () => {
  assertEquals(
    chapterTitle(clean, "Jarom"),
    "Jarom 1 — No Textual Variants | Book of Mormon Compare",
  );
});

Deno.test("chapterTitle drops the site suffix when over 60 characters", () => {
  const wOfM: ChapterVariantStats = { ...alma5, book: "w-of-m", chapter: 1 };
  assertEquals(
    chapterTitle(wOfM, "Words of Mormon"),
    "Words of Mormon 1 — 581 Textual Variants",
  );
});

Deno.test("chapterDescription names counts and both witnesses, within 155 chars", () => {
  const description = chapterDescription(alma5, "Alma");
  assertEquals(
    description,
    "Alma 5 has 581 textual variants across its 63 verses between the Printer's Manuscript and the 2013 Edition, including spelling and punctuation.",
  );
  assertEquals(description.length <= 155, true);
});

Deno.test("chapterDescription includes the qualifier when it fits (Alma 5)", () => {
  const description = chapterDescription(alma5, "Alma");
  assertEquals(
    description.includes("including spelling and punctuation."),
    true,
  );
});

Deno.test("chapterDescription drops the qualifier rather than truncate a sentence (real witnesses/1 data)", () => {
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
  assertEquals(description.includes("including spelling"), false);
  assertEquals(
    description,
    "Witness Testimonies 1 has 98 textual variants across its 15 verses between the Printer's Manuscript and the 2013 Edition.",
  );
});

Deno.test("chapterDescription keeps the qualifier when the shorter phrasing fits (real w-of-m/1 data)", () => {
  const wOfM1: ChapterVariantStats = {
    book: "w-of-m",
    chapter: 1,
    variantCount: 167,
    changedVerseCount: 19,
    totalVerseCount: 19,
  };
  const description = chapterDescription(wOfM1, "Words of Mormon");
  assertEquals(description.length <= 155, true);
  assertEquals(
    description,
    "Words of Mormon 1 has 167 textual variants across its 19 verses between the Printer's Manuscript and the 2013 Edition, including spelling and punctuation.",
  );
});

Deno.test("chapterDescription states zero plainly", () => {
  assertEquals(
    chapterDescription(clean, "Jarom"),
    "Jarom 1 has no textual variants between the Printer's Manuscript and the 2013 Edition across its 15 verses, including spelling and punctuation.",
  );
});

Deno.test("chapterSummarySentence reads as prose", () => {
  assertEquals(
    chapterSummarySentence(alma5),
    "581 textual variants across 63 verses between the Printer's Manuscript and the 2013 Edition, including spelling, capitalization, and punctuation.",
  );
  assertEquals(
    chapterSummarySentence(enos1),
    "1 textual variant across 1 verse between the Printer's Manuscript and the 2013 Edition, including spelling, capitalization, and punctuation.",
  );
  assertEquals(
    chapterSummarySentence(clean),
    "No textual variants between the Printer's Manuscript and the 2013 Edition in this chapter.",
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
    "Enos carries 13 textual variants across 2 chapters when the Printer's Manuscript is set against the 2013 Edition, including spelling, capitalization, and punctuation.",
    "Chapter 2 varies most, with 9; across the book that is an average of 7 variants per chapter.",
  ]);
});

Deno.test("bookIntroSentences uses a per-verse average for single-chapter books", () => {
  const chapters: ChapterVariantStats[] = [
    {
      book: "enos",
      chapter: 1,
      variantCount: 231,
      changedVerseCount: 28,
      totalVerseCount: 28,
    },
  ];
  assertEquals(bookIntroSentences("Enos", chapters), [
    "Enos carries 231 textual variants across 1 chapter when the Printer's Manuscript is set against the 2013 Edition, including spelling, capitalization, and punctuation.",
    "Its 28 verses carry an average of 8 variants each.",
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
    "Jarom carries no textual variants across 1 chapter when the Printer's Manuscript is set against the 2013 Edition.",
    "All 15 of its verses read identically in both witnesses.",
  ]);
});

Deno.test("bookIntroSentences formats thousand separators using the real Alma book totals", async () => {
  const stats = await loadVariantStats();
  const alma = stats.forBook("alma");
  assertEquals(bookIntroSentences("Alma", alma), [
    "Alma carries 16,333 textual variants across 63 chapters when the Printer's Manuscript is set against the 2013 Edition, including spelling, capitalization, and punctuation.",
    "Chapter 5 varies most, with 581; across the book that is an average of 259 variants per chapter.",
  ]);
});

Deno.test("bookDescription reports totals compared verse by verse (real Alma book totals)", async () => {
  const stats = await loadVariantStats();
  const alma = stats.forBook("alma");
  assertEquals(
    bookDescription("Alma", alma),
    "Alma has 16,333 textual variants across 63 chapters, compared verse by verse between the Printer's Manuscript and the 2013 Edition.",
  );
});

Deno.test("bookDescription states a variant-free book plainly", () => {
  const chapters: ChapterVariantStats[] = [
    {
      book: "jarom",
      chapter: 1,
      variantCount: 0,
      changedVerseCount: 0,
      totalVerseCount: 15,
    },
  ];
  assertEquals(
    bookDescription("Jarom", chapters),
    "Jarom has no textual variants between the Printer's Manuscript and the 2013 Edition across its 1 chapter.",
  );
});

Deno.test("bookDescription uses the singular for a single-chapter book", () => {
  const chapters: ChapterVariantStats[] = [
    {
      book: "enos",
      chapter: 1,
      variantCount: 231,
      changedVerseCount: 28,
      totalVerseCount: 28,
    },
  ];
  assertEquals(
    bookDescription("Enos", chapters),
    "Enos has 231 textual variants across 1 chapter, compared verse by verse between the Printer's Manuscript and the 2013 Edition.",
  );
});

Deno.test("bookDescription stays within 155 characters and ends with a period for every real book", async () => {
  const stats = await loadVariantStats();
  const realBooks = BOOK_ORDER.filter((book) =>
    book !== "witnesses" && book !== "title-page"
  );
  for (const book of realBooks) {
    const chapters = stats.forBook(book);
    const description = bookDescription(getBookDisplayName(book), chapters);
    assertEquals(
      description.length <= 155,
      true,
      `${book}: "${description}" (${description.length} chars)`,
    );
    assertEquals(
      description.endsWith("."),
      true,
      `${book}: "${description}"`,
    );
  }
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

Deno.test("loadVariantStats degrades to empty when the file's pair does not match the canonical pair", async () => {
  const path = await Deno.makeTempFile({ suffix: ".json" });
  try {
    await Deno.writeTextFile(
      path,
      JSON.stringify({
        pair: { v1: "om", v2: "2013" },
        generatedAt: "2026-01-01",
        chapters: [
          {
            book: "alma",
            chapter: 5,
            variantCount: 1,
            changedVerseCount: 1,
            totalVerseCount: 1,
          },
        ],
      }),
    );
    const stats = await loadVariantStats(path);
    assertEquals(stats.forChapter("alma", 5), null);
    assertEquals(stats.forBook("alma"), []);
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("bookHubTitle stays within 60 characters and is well-formed for every hub book", () => {
  const hubBooks = BOOK_ORDER.filter((book) => !CHAPTERLESS_BOOKS.has(book));
  assertEquals(hubBooks.length, 15);
  for (const book of hubBooks) {
    const title = bookHubTitle(getBookDisplayName(book));
    assertEquals(
      title.length <= 60,
      true,
      `${book}: "${title}" (${title.length} chars)`,
    );
    assertEquals(
      title.includes("Textual Variants by Chapter"),
      true,
      `${book}: "${title}"`,
    );
  }
});

Deno.test("chapterTitle stays within 60 characters and chapterDescription within 155 (ending with a period) for every real chapter", async () => {
  const stats = await loadVariantStats();
  for (const book of BOOK_ORDER) {
    const bookName = getBookDisplayName(book);
    for (const record of stats.forBook(book)) {
      const title = chapterTitle(record, bookName);
      assertEquals(
        title.length <= 60,
        true,
        `${book}/${record.chapter}: "${title}" (${title.length} chars)`,
      );
      const description = chapterDescription(record, bookName);
      assertEquals(
        description.length <= 155,
        true,
        `${book}/${record.chapter}: "${description}" (${description.length} chars)`,
      );
      assertEquals(
        description.endsWith("."),
        true,
        `${book}/${record.chapter}: "${description}"`,
      );
    }
  }
});
