import { assertEquals } from "@std/assert";
import { insertSpaceBetween, splitText } from "./textHelpers.ts";

Deno.test("splitText splits words", () => {
  assertEquals(splitText("And it came to pass"), [
    "And",
    "it",
    "came",
    "to",
    "pass",
  ]);
});

Deno.test("splitText splits on punctuation boundaries", () => {
  const result = splitText("words, and more");
  assertEquals(result.includes(","), true);
  assertEquals(result.includes("words"), true);
});

Deno.test("splitText filters empty strings and spaces", () => {
  const result = splitText("  hello  world  ");
  assertEquals(result, ["hello", "world"]);
});

Deno.test("insertSpaceBetween returns space between two words", () => {
  assertEquals(insertSpaceBetween("hello", "world"), " ");
});

Deno.test("insertSpaceBetween returns empty before punctuation", () => {
  assertEquals(insertSpaceBetween("hello", ","), "");
});

Deno.test("insertSpaceBetween returns empty when next is undefined", () => {
  assertEquals(insertSpaceBetween("hello", undefined), "");
});

Deno.test("insertSpaceBetween returns empty when text1 opens bracket", () => {
  assertEquals(insertSpaceBetween("<", "word"), "");
});

Deno.test("insertSpaceBetween returns empty after a hyphen token", () => {
  assertEquals(insertSpaceBetween("-", "shalal"), "");
});

Deno.test("hyphenated compound round-trips without extra spaces", () => {
  const tokens = splitText("Maher-shalal-hash-baz.");
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    out += tokens[i] + insertSpaceBetween(tokens[i], tokens[i + 1]);
  }
  assertEquals(out, "Maher-shalal-hash-baz.");
});

Deno.test("insertSpaceBetween keeps space after an em dash", () => {
  assertEquals(insertSpaceBetween("—", "that"), " ");
});
