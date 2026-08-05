import { assertEquals } from "@std/assert";
import { BOOK_ORDER } from "./data.ts";
import {
  buildChapterHref,
  CHAPTER_COUNTS,
  CHAPTERLESS_BOOKS,
} from "./bookChapters.ts";

Deno.test("CHAPTER_COUNTS covers every book in BOOK_ORDER", () => {
  for (const book of BOOK_ORDER) {
    assertEquals(
      typeof CHAPTER_COUNTS[book],
      "number",
      `missing count for ${book}`,
    );
    assertEquals(
      CHAPTER_COUNTS[book] > 0,
      true,
      `non-positive count for ${book}`,
    );
  }
});

Deno.test("CHAPTER_COUNTS has the canonical Book of Mormon totals", () => {
  assertEquals(CHAPTER_COUNTS["1-ne"], 22);
  assertEquals(CHAPTER_COUNTS["2-ne"], 33);
  assertEquals(CHAPTER_COUNTS["jacob"], 7);
  assertEquals(CHAPTER_COUNTS["enos"], 1);
  assertEquals(CHAPTER_COUNTS["jarom"], 1);
  assertEquals(CHAPTER_COUNTS["omni"], 1);
  assertEquals(CHAPTER_COUNTS["w-of-m"], 1);
  assertEquals(CHAPTER_COUNTS["mosiah"], 29);
  assertEquals(CHAPTER_COUNTS["alma"], 63);
  assertEquals(CHAPTER_COUNTS["hel"], 16);
  assertEquals(CHAPTER_COUNTS["3-ne"], 30);
  assertEquals(CHAPTER_COUNTS["4-ne"], 1);
  assertEquals(CHAPTER_COUNTS["morm"], 9);
  assertEquals(CHAPTER_COUNTS["ether"], 15);
  assertEquals(CHAPTER_COUNTS["moro"], 10);
});

Deno.test("CHAPTERLESS_BOOKS members are real single-chapter books", () => {
  for (const book of CHAPTERLESS_BOOKS) {
    assertEquals(
      BOOK_ORDER.includes(book as (typeof BOOK_ORDER)[number]),
      true,
      `${book} is not in BOOK_ORDER`,
    );
    assertEquals(
      CHAPTER_COUNTS[book as keyof typeof CHAPTER_COUNTS],
      1,
      `${book} does not have exactly 1 chapter`,
    );
  }
});

Deno.test("buildChapterHref encodes v1 and v2", () => {
  assertEquals(
    buildChapterHref("alma", "32", "2013", "1830"),
    "/alma/32?v1=2013&v2=1830",
  );
});

Deno.test("buildChapterHref URL-encodes special characters in versions", () => {
  assertEquals(
    buildChapterHref("1-ne", "1", "weird name", "1830"),
    "/1-ne/1?v1=weird+name&v2=1830",
  );
});
