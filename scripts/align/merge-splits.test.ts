import { assertEquals } from "@std/assert";
import { mergeLineBreakSplits } from "./merge-splits.ts";
import type { SourceWord } from "./types.ts";

function word(
  norm: string,
  line: number,
  wordIndexInLine: number,
): SourceWord {
  return { norm, raw: norm, page: 1, line, wordIndexInLine };
}

Deno.test("merges split when first fragment is not canonical", () => {
  const source = [word("wher", 1, 5), word("efore", 2, 0)];
  const canon = new Set(["wherefore"]);
  const { words, spanOf } = mergeLineBreakSplits(source, canon);
  assertEquals(words.map((w) => w.norm), ["wherefore"]);
  assertEquals([...spanOf], [2]);
});

Deno.test("merges split when first fragment is canonical but second is not", () => {
  const source = [word("righteous", 1, 8), word("ness", 2, 0)];
  const canon = new Set(["righteous", "righteousness"]);
  const { words, spanOf } = mergeLineBreakSplits(source, canon);
  assertEquals(words.map((w) => w.norm), ["righteousness"]);
  assertEquals([...spanOf], [2]);
});

Deno.test("does not merge when both fragments are canonical words", () => {
  const source = [word("in", 1, 3), word("to", 2, 0)];
  const canon = new Set(["in", "to", "into"]);
  const { words, spanOf } = mergeLineBreakSplits(source, canon);
  assertEquals(words.map((w) => w.norm), ["in", "to"]);
  assertEquals([...spanOf], [1, 1]);
});

Deno.test("does not merge within the same line", () => {
  const source = [word("righteous", 1, 3), word("ness", 1, 4)];
  const canon = new Set(["righteous", "righteousness"]);
  const { words } = mergeLineBreakSplits(source, canon);
  assertEquals(words.map((w) => w.norm), ["righteous", "ness"]);
});

Deno.test("does not merge when combined form is not canonical", () => {
  const source = [word("his", 1, 3), word("ments", 2, 0)];
  const canon = new Set(["his"]);
  const { words } = mergeLineBreakSplits(source, canon);
  assertEquals(words.map((w) => w.norm), ["his", "ments"]);
});
