import { assertEquals, assertRejects } from "@std/assert";
import {
  BOOK_DISPLAY_NAMES,
  BOOK_ORDER,
  getAdjacentChapters,
  getVersions,
  loadChapter,
  STUB_VERSES,
} from "./data.ts";

Deno.test("STUB_VERSES has at least one verse", () => {
  assertEquals(STUB_VERSES.length > 0, true);
});

Deno.test("getVersions returns ['stub'] when data dir is missing", async () => {
  const versions = await getVersions("/nonexistent/data/bom");
  assertEquals(versions, ["stub"]);
});

Deno.test("loadChapter stub version reads from data/bom/stub", async () => {
  const verses = await loadChapter("stub", "1-ne", "1");
  assertEquals(verses.length, 3);
  assertEquals(verses[0].chapter, 1);
  assertEquals(verses[0].verse, 1);
  assertEquals(typeof verses[0].text, "string");
});

Deno.test("loadChapter falls back to STUB_VERSES when stub file missing", async () => {
  const verses = await loadChapter("stub", "nonexistent-book", "99");
  assertEquals(verses, STUB_VERSES);
});

Deno.test("loadChapter throws for missing non-stub file", async () => {
  await assertRejects(
    () => loadChapter("1830", "1-ne", "1"),
    Error,
  );
});

Deno.test("BOOK_ORDER: 15 entries, starts with 1-ne, ends with moro", () => {
  assertEquals(BOOK_ORDER.length, 15);
  assertEquals(BOOK_ORDER[0], "1-ne");
  assertEquals(BOOK_ORDER[14], "moro");
});

Deno.test("BOOK_DISPLAY_NAMES: every book in BOOK_ORDER has a display name", () => {
  for (const book of BOOK_ORDER) {
    assertEquals(typeof BOOK_DISPLAY_NAMES[book], "string");
  }
});

Deno.test("getAdjacentChapters: first chapter of first book has null prev", async () => {
  const { prev } = await getAdjacentChapters("stub", "1-ne", "1");
  assertEquals(prev, null);
});

Deno.test("getAdjacentChapters: unknown version returns null prev and next", async () => {
  const { prev, next } = await getAdjacentChapters("nonexistent", "1-ne", "1");
  assertEquals(prev, null);
  assertEquals(next, null);
});
