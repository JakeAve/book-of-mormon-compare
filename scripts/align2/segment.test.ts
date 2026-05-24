import { assertEquals } from "@std/assert";
import { buildAllVerseOutputs } from "./segment.ts";
import type { CursorResult, LineInfo } from "./types.ts";

function makeResults(
  lineWords: { page: number; line: number; words: string[] }[],
  verse: { book: string; chapter: number; verse: number },
): CursorResult[] {
  const out: CursorResult[] = [];
  for (const l of lineWords) {
    for (let i = 0; i < l.words.length; i++) {
      out.push({
        norm: l.words[i].toLowerCase().replace(/[^a-z0-9]/g, ""),
        raw: l.words[i],
        page: l.page,
        line: l.line,
        wordIndexInLine: i,
        assignedVerse: verse,
      });
    }
  }
  return out;
}

// Rule 1: mid-word join
Deno.test("segment: Rule 1 — mid-word line break joins without space (perish)", () => {
  const verse = { book: "1-ne", chapter: 3, verse: 5 };
  const canonText = "many did perish in the land";
  const lineInfos = new Map<string, LineInfo>([
    ["7:10", {
      page: 7,
      line: 10,
      text: "& it came to pass that many did per",
      source: "url",
    }],
    ["7:11", { page: 7, line: 11, text: "ish in the land", source: "url" }],
  ]);
  const results = [
    ...makeResults([{
      page: 7,
      line: 10,
      words: ["&", "it", "came", "to", "pass", "that", "many", "did", "per"],
    }], verse),
    ...makeResults(
      [{ page: 7, line: 11, words: ["ish", "in", "the", "land"] }],
      verse,
    ),
  ];
  const canonByKey = new Map([["1-ne|3|5", canonText]]);
  const [outVerse] = buildAllVerseOutputs(results, lineInfos, canonByKey);

  // Line 10 should NOT have a trailing space (applyJoins removed it)
  const line10 = outVerse.lines.find((l) => l.line === 10);
  assertEquals(line10?.text.endsWith(" "), false);
  // The combined text across both lines should contain "perish" (no space)
  const combined = outVerse.lines.map((l) => l.text).join("");
  assertEquals(combined.includes("perish"), true);
});

// Rule 2: verse-split line IDs
Deno.test("segment: Rule 2 — line spanning two verses gets a/b id suffixes", () => {
  const lineInfos = new Map<string, LineInfo>([
    ["3:2", {
      page: 3,
      line: 2,
      text: "unto me look & I lookt",
      source: "url",
    }],
  ]);
  const rawWords = ["unto", "me", "look", "&", "I", "lookt"];
  const verse3 = { book: "1-ne", chapter: 1, verse: 3 };
  const verse4 = { book: "1-ne", chapter: 1, verse: 4 };
  const results: CursorResult[] = rawWords.map((w, i) => ({
    norm: w.toLowerCase().replace(/[^a-z]/g, ""),
    raw: w,
    page: 3,
    line: 2,
    wordIndexInLine: i,
    assignedVerse: i < 3 ? verse3 : verse4,
  }));
  const canonByKey = new Map([
    ["1-ne|1|3", "unto me look"],
    ["1-ne|1|4", "and I looked"],
  ]);
  const outVerses = buildAllVerseOutputs(results, lineInfos, canonByKey);

  const v3 = outVerses.find((v) => v.verse === 3)!;
  const v4 = outVerses.find((v) => v.verse === 4)!;

  assertEquals(v3.lines[0].id, "3:2a");
  assertEquals(v3.lines[0].text.trim(), "unto me look");
  assertEquals(v4.lines[0].id, "3:2b");
  assertEquals(v4.lines[0].text.trim(), "& I lookt");
});

// Simple single-line, single-verse — no suffix
Deno.test("segment: single verse single line — no id suffix", () => {
  const verse = { book: "1-ne", chapter: 1, verse: 1 };
  const lineInfos = new Map<string, LineInfo>([
    ["5:14", { page: 5, line: 14, text: "I Nephi having been", source: "url" }],
  ]);
  const results = makeResults(
    [{ page: 5, line: 14, words: ["I", "Nephi", "having", "been"] }],
    verse,
  );
  const canonByKey = new Map([["1-ne|1|1", "I Nephi having been born"]]);
  const [outVerse] = buildAllVerseOutputs(results, lineInfos, canonByKey);

  assertEquals(outVerse.lines[0].id, "5:14");
  assertEquals(outVerse.lines[0].text, "I Nephi having been");
  assertEquals(outVerse.lines[0].source, "url");
});

// Markdown slicing — only present when differs from text
Deno.test("segment: markdown slice included only when different from text", () => {
  const verse = { book: "1-ne", chapter: 1, verse: 6 };
  const lineInfos = new Map<string, LineInfo>([
    ["5:6", {
      page: 5,
      line: 6,
      text: "rney into the wilderness",
      markdown: "rney ~~un~~ into the wilderness",
      source: "url",
    }],
  ]);
  const results = makeResults(
    [{ page: 5, line: 6, words: ["rney", "into", "the", "wilderness"] }],
    verse,
  );
  const canonByKey = new Map([["1-ne|1|6", "journey into the wilderness"]]);
  const [outVerse] = buildAllVerseOutputs(results, lineInfos, canonByKey);

  assertEquals(outVerse.lines[0].text, "rney into the wilderness");
  // markdown differs from text — should be present
  assertEquals(typeof outVerse.lines[0].markdown, "string");
  assertEquals(outVerse.lines[0].markdown?.includes("~~un~~"), true);
});
