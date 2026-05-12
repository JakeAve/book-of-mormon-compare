import { assertEquals } from "jsr:@std/assert";
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
