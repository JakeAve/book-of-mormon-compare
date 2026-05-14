import { assertEquals } from "@std/assert";
import {
  BOOK_DISPLAY_NAMES,
  BOOK_ORDER,
  getAdjacentChapters,
  getVersions,
  loadChapter,
} from "./data.ts";

const BOM_DIR = new URL("../data/bom", import.meta.url).pathname;

Deno.test("getVersions returns [] when data dir is missing", async () => {
  const versions = await getVersions("/nonexistent/data/bom");
  assertEquals(versions, []);
});

Deno.test("loadChapter reads a real chapter", async () => {
  const verses = await loadChapter("2013", "1-ne", "1", BOM_DIR);
  assertEquals(verses.length > 0, true);
  assertEquals(verses[0].chapter, 1);
  assertEquals(typeof verses[0].text, "string");
});

Deno.test("loadChapter returns [] for missing file", async () => {
  const verses = await loadChapter("2013", "nonexistent-book", "99", BOM_DIR);
  assertEquals(verses, []);
});

Deno.test("BOOK_ORDER: 17 entries, starts with witnesses, ends with moro", () => {
  assertEquals(BOOK_ORDER.length, 17);
  assertEquals(BOOK_ORDER[0], "witnesses");
  assertEquals(BOOK_ORDER[16], "moro");
});

Deno.test("BOOK_DISPLAY_NAMES: every book in BOOK_ORDER has a display name", () => {
  for (const book of BOOK_ORDER) {
    assertEquals(typeof BOOK_DISPLAY_NAMES[book], "string");
  }
});

Deno.test("getAdjacentChapters: first chapter of first book has null prev", async () => {
  const { prev } = await getAdjacentChapters("2013", "witnesses", "1", BOM_DIR);
  assertEquals(prev, null);
});

Deno.test("getAdjacentChapters: unknown version returns null prev and next", async () => {
  const { prev, next } = await getAdjacentChapters(
    "nonexistent",
    "1-ne",
    "1",
    BOM_DIR,
  );
  assertEquals(prev, null);
  assertEquals(next, null);
});

Deno.test("loadChapter om: verse with markup lines has markdown set", async () => {
  const verses = await loadChapter("om", "1-ne", "10", BOM_DIR);
  const withMarkdown = verses.filter((v) => v.markdown !== undefined);
  assertEquals(withMarkdown.length > 0, true);
  // markdown stitches line.markdown ?? line.text
  const v = withMarkdown[0];
  assertEquals(typeof v.markdown, "string");
  assertEquals(v.markdown!.length > 0, true);
});

Deno.test("loadChapter om: verse with no markup lines has undefined markdown", async () => {
  // Load a chapter where all lines have no markdown field — markdown should be absent
  const verses = await loadChapter("2013", "1-ne", "1", BOM_DIR);
  const withMarkdown = verses.filter((v) => v.markdown !== undefined);
  assertEquals(withMarkdown.length, 0);
});
