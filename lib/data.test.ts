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
