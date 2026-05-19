import { assertEquals } from "@std/assert";
import { parseVerseParam } from "./verseHighlight.ts";

Deno.test("null for absent param", () => {
  assertEquals(parseVerseParam(null), null);
});

Deno.test("null for empty string", () => {
  assertEquals(parseVerseParam(""), null);
});

Deno.test("single verse", () => {
  assertEquals(parseVerseParam("5"), new Set([5]));
});

Deno.test("range", () => {
  assertEquals(parseVerseParam("8-9"), new Set([8, 9]));
});

Deno.test("comma-separated verses and ranges", () => {
  assertEquals(parseVerseParam("3,6,8-9"), new Set([3, 6, 8, 9]));
});

Deno.test("null for invalid segment", () => {
  assertEquals(parseVerseParam("abc"), null);
});

Deno.test("null for reversed range", () => {
  assertEquals(parseVerseParam("9-5"), null);
});

Deno.test("null for zero or negative", () => {
  assertEquals(parseVerseParam("0"), null);
  assertEquals(parseVerseParam("-1"), null);
});
