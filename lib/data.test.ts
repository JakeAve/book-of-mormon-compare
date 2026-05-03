import { assertEquals, assertRejects } from "jsr:@std/assert";
import { getVersions, loadChapter, STUB_VERSES } from "./data.ts";

Deno.test("STUB_VERSES has at least one verse", () => {
  assertEquals(STUB_VERSES.length > 0, true);
});

Deno.test("getVersions returns ['stub'] when data dir is missing", async () => {
  const versions = await getVersions("/nonexistent/data/bom");
  assertEquals(versions, ["stub"]);
});

Deno.test("loadChapter stub version reads from data/bom/stub", async () => {
  const verses = await loadChapter("stub", "1-nephi", "1");
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
    () => loadChapter("1830", "1-nephi", "1"),
    Error,
  );
});
