import { assertEquals } from "@std/assert";
import { attachOrphanMarkersToPrecedingVerse } from "./chapter-markers.ts";
import type { CursorResult, LineInfo } from "./types.ts";

function word(
  raw: string,
  page: number,
  line: number,
  wordIndexInLine: number,
  verse: { book: string; chapter: number; verse: number },
): CursorResult {
  return {
    norm: raw.toLowerCase().replace(/[^a-z0-9]/g, ""),
    raw,
    page,
    line,
    wordIndexInLine,
    assignedVerse: verse,
  };
}

Deno.test("attachOrphanMarkersToPrecedingVerse - reattaches a marker stuck on verse 1 back to verse 0", () => {
  const v0 = { book: "mosiah", chapter: 1, verse: 0 };
  const v1 = { book: "mosiah", chapter: 1, verse: 1 };
  const results: CursorResult[] = [
    word("book", 1, 1, 0, v0),
    word("of", 1, 1, 1, v0),
    word("mosiah", 1, 1, 2, v0),
    word("chapter", 1, 2, 0, v1),
    word("i", 1, 2, 1, v1),
    word("and", 1, 3, 0, v1),
  ];
  const lineInfos = new Map<string, LineInfo>([
    ["1:2", { page: 1, line: 2, text: "CHAPTER I." }],
  ]);
  const out = attachOrphanMarkersToPrecedingVerse(results, lineInfos);
  assertEquals(out[3].assignedVerse, v0);
  assertEquals(out[4].assignedVerse, v0);
  // Real verse 1 content is untouched.
  assertEquals(out[5].assignedVerse, v1);
});

Deno.test("attachOrphanMarkersToPrecedingVerse - leaves a marker already on verse 0 alone", () => {
  const v0 = { book: "alma", chapter: 1, verse: 0 };
  const results: CursorResult[] = [
    word("alma", 1, 1, 0, v0),
    word("chapter", 1, 2, 0, v0),
    word("i", 1, 2, 1, v0),
    word("account", 1, 2, 2, v0),
  ];
  const lineInfos = new Map<string, LineInfo>([
    ["1:2", { page: 1, line: 2, text: "CHAPTER I. account" }],
  ]);
  const out = attachOrphanMarkersToPrecedingVerse(results, lineInfos);
  assertEquals(
    out.map((r) => r.assignedVerse),
    results.map((r) => r.assignedVerse),
  );
});

Deno.test("attachOrphanMarkersToPrecedingVerse - leaves a real cross-chapter marker alone", () => {
  // Marker sits at the start of a genuinely new chapter (2); the preceding
  // word is in chapter 1's last verse — a different chapter, not verse 0 of
  // the same chapter — so this isn't the pattern we're correcting for.
  const chapter1End = { book: "alma", chapter: 1, verse: 30 };
  const chapter2Start = { book: "alma", chapter: 2, verse: 1 };
  const results: CursorResult[] = [
    word("stead", 1, 1, 0, chapter1End),
    word("chapter", 1, 2, 0, chapter2Start),
    word("ii", 1, 2, 1, chapter2Start),
    word("and", 1, 3, 0, chapter2Start),
  ];
  const lineInfos = new Map<string, LineInfo>([
    ["1:2", { page: 1, line: 2, text: "CHAPTER II." }],
  ]);
  const out = attachOrphanMarkersToPrecedingVerse(results, lineInfos);
  assertEquals(out[1].assignedVerse, chapter2Start);
  assertEquals(out[2].assignedVerse, chapter2Start);
});

Deno.test("attachOrphanMarkersToPrecedingVerse - leaves an ordinary mid-chapter marker on the following verse", () => {
  // 1830/1837 print their own large-chapter markers between two ordinary
  // verses of the SAME canonical chapter (verse 24 and 25, say) — this is
  // ordinary, expected, and already correctly left on the following verse.
  // Only a preceding verse 0 (a book's title verse) should trigger a move.
  const v24 = { book: "mosiah", chapter: 13, verse: 24 };
  const v25 = { book: "mosiah", chapter: 13, verse: 25 };
  const results: CursorResult[] = [
    word("neighbors", 1, 1, 0, v24),
    word("chapter", 1, 2, 0, v25),
    word("viii", 1, 2, 1, v25),
    word("and", 1, 3, 0, v25),
  ];
  const lineInfos = new Map<string, LineInfo>([
    ["1:2", { page: 1, line: 2, text: "CHAPTER VIII." }],
  ]);
  const out = attachOrphanMarkersToPrecedingVerse(results, lineInfos);
  assertEquals(out[1].assignedVerse, v25);
  assertEquals(out[2].assignedVerse, v25);
});
