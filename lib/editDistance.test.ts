import { assertEquals } from "@std/assert";
import { levenshtein } from "./editDistance.ts";

Deno.test("levenshtein: identical strings have distance 0", () => {
  assertEquals(levenshtein("savior", "savior"), 0);
});

Deno.test("levenshtein: single substitution", () => {
  assertEquals(levenshtein("cat", "cot"), 1);
});

Deno.test("levenshtein: insertion (saviour vs savior)", () => {
  assertEquals(levenshtein("saviour", "savior"), 1);
});

Deno.test("levenshtein: handles empty strings", () => {
  assertEquals(levenshtein("", "abc"), 3);
  assertEquals(levenshtein("abc", ""), 3);
  assertEquals(levenshtein("", ""), 0);
});

Deno.test("levenshtein: full replacement", () => {
  assertEquals(levenshtein("unto", "to"), 2);
});
