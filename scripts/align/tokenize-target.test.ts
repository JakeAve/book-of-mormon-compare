import { assertEquals } from "@std/assert";
import { groupByVerse, tokenizeTarget } from "./tokenize-target.ts";

const SAMPLE_VERSES = [
  {
    book: "1-ne",
    chapter: 1,
    verse: 1,
    text: "I Nephi having been born",
    source: "url",
  },
  {
    book: "1-ne",
    chapter: 1,
    verse: 2,
    text: "And he did teach me",
    source: "url",
  },
];

Deno.test("tokenizeTarget: produces normalized words with verse metadata", () => {
  const words = tokenizeTarget(SAMPLE_VERSES);
  assertEquals(words[0].norm, "i");
  assertEquals(words[0].book, "1-ne");
  assertEquals(words[0].chapter, 1);
  assertEquals(words[0].verse, 1);
  assertEquals(words[4].norm, "born");
  assertEquals(words[5].norm, "and");
  assertEquals(words[5].verse, 2);
});

Deno.test("tokenizeTarget: normalizes & to and", () => {
  const words = tokenizeTarget([
    { book: "1-ne", chapter: 1, verse: 1, text: "Lehi & Sariah", source: "" },
  ]);
  assertEquals(words[1].norm, "and");
});

Deno.test("tokenizeTarget: skips punctuation-only tokens", () => {
  const words = tokenizeTarget([
    { book: "1-ne", chapter: 1, verse: 1, text: "end, start", source: "" },
  ]);
  assertEquals(words.map((w) => w.norm), ["end", "start"]);
});

Deno.test("groupByVerse: groups tokens by verse", () => {
  const words = tokenizeTarget(SAMPLE_VERSES);
  const groups = groupByVerse(words);
  assertEquals(groups.length, 2);
  assertEquals(groups[0].verse, 1);
  assertEquals(groups[0].words.map((w) => w.norm), [
    "i",
    "nephi",
    "having",
    "been",
    "born",
  ]);
  assertEquals(groups[1].verse, 2);
  assertEquals(groups[1].chapter, 1);
  assertEquals(groups[1].book, "1-ne");
});

Deno.test("groupByVerse: empty input returns empty array", () => {
  assertEquals(groupByVerse([]), []);
});
