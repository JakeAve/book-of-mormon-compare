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

Deno.test("getVersions orders known versions by publication, not alphabetically", async () => {
  const versions = await getVersions(BOM_DIR);
  assertEquals(versions, ["om", "pm", "1830", "1837", "1840", "1841", "2013"]);
});

Deno.test("getVersions puts unrecognized directories after known versions, alphabetically", async () => {
  const dir = await Deno.makeTempDir();
  try {
    for (const name of ["2013", "zzz-future", "1830", "aaa-future", "om"]) {
      await Deno.mkdir(`${dir}/${name}`);
    }
    const versions = await getVersions(dir);
    assertEquals(versions, ["om", "1830", "2013", "aaa-future", "zzz-future"]);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
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

Deno.test("loadChapter om: verse with no markdown on lines has undefined markdown", async () => {
  // hel 16:12 has lines but no markdown field — stitchMarkdown early-return
  // tests that normalizeVerse(aligned) returns verse unchanged
  const verses = await loadChapter("om", "hel", "16", BOM_DIR);
  const v12 = verses.find((v) => v.verse === 12);
  assertEquals(v12 !== undefined, true);
  // lines exist but none have markdown field
  assertEquals(v12!.markdown, undefined);
});
