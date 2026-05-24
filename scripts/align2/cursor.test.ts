import { assertEquals, assertExists } from "@std/assert";
import { runCursor } from "./cursor.ts";
import type { SourceWord } from "./types.ts";
import type { VerseGroup } from "./tokenize-target.ts";

function src(words: string[], page = 1, line = 1): SourceWord[] {
  return words.map((w, i) => ({
    norm: w.toLowerCase().replace(/[^a-z0-9]/g, ""),
    raw: w,
    page,
    line,
    wordIndexInLine: i,
  }));
}

function tgt(verse: number, words: string[]): VerseGroup {
  return {
    book: "1-ne",
    chapter: 1,
    verse,
    words: words.map((w) => ({
      norm: w.toLowerCase().replace(/[^a-z]/g, ""),
      book: "1-ne",
      chapter: 1,
      verse,
    })),
  };
}

Deno.test("runCursor: single verse — all words assigned to it", () => {
  const result = runCursor(
    src(["I", "Nephi", "having", "been", "born"]),
    [tgt(1, ["i", "nephi", "having", "been", "born"])],
    new Map(),
  );
  assertEquals(result.length, 5);
  for (const r of result) {
    assertEquals(r.assignedVerse, { book: "1-ne", chapter: 1, verse: 1 });
  }
});

Deno.test("runCursor: two verses — boundary at correct word", () => {
  const result = runCursor(
    src(["I", "Nephi", "having", "been", "born"]),
    [
      tgt(1, ["i", "nephi"]),
      tgt(2, ["having", "been", "born"]),
    ],
    new Map(),
  );
  assertEquals(result[0].assignedVerse.verse, 1);
  assertEquals(result[1].assignedVerse.verse, 1);
  assertEquals(result[2].assignedVerse.verse, 2);
  assertEquals(result[3].assignedVerse.verse, 2);
  assertEquals(result[4].assignedVerse.verse, 2);
});

Deno.test("runCursor: unmatched source words inherit surrounding verse", () => {
  // "xyzabc" has no match in the target — should inherit verse 1
  const result = runCursor(
    src(["I", "xyzabc", "Nephi"]),
    [tgt(1, ["i", "nephi"])],
    new Map(),
  );
  assertEquals(result.length, 3);
  for (const r of result) {
    assertEquals(r.assignedVerse.verse, 1);
  }
});

Deno.test("runCursor: no-match chapter advances by canonical length, next chapter still matches", () => {
  // Canon chapter 1 has no words in source — cursor advances by ~1 word (canon length).
  // Canon chapter 2 words appear at source positions 10-11 — must still be matched.
  // Uses separate chapter numbers so buildCanonChapters treats them independently.
  const filler = Array.from({ length: 10 }, (_, i) => `zzz${i}`);
  const result = runCursor(
    src([...filler, "i", "nephi"]),
    [
      {
        book: "1-ne",
        chapter: 1,
        verse: 1,
        words: [{ norm: "doesnotappear", book: "1-ne", chapter: 1, verse: 1 }],
      },
      {
        book: "1-ne",
        chapter: 2,
        verse: 1,
        words: [
          { norm: "i", book: "1-ne", chapter: 2, verse: 1 },
          { norm: "nephi", book: "1-ne", chapter: 2, verse: 1 },
        ],
      },
    ],
    new Map(),
  );
  const ch2 = result.filter((r) => r.assignedVerse.chapter === 2);
  assertExists(ch2.find((r) => r.norm === "i"));
  assertExists(ch2.find((r) => r.norm === "nephi"));
});

Deno.test("runCursor: trailing source words after all verses get last verse", () => {
  const result = runCursor(
    src(["I", "Nephi", "extra", "words"]),
    [tgt(1, ["i", "nephi"])],
    new Map(),
  );
  for (const r of result) {
    assertEquals(r.assignedVerse.verse, 1);
  }
});

Deno.test("runCursor: result length equals source length", () => {
  const source = src(["a", "b", "c", "d", "e"]);
  const result = runCursor(source, [
    tgt(1, ["a", "b"]),
    tgt(2, ["c", "d", "e"]),
  ], new Map());
  assertEquals(result.length, source.length);
});
