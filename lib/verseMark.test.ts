import { assertEquals } from "@std/assert";
import { parseMarkParam } from "./verseMark.ts";

Deno.test("null for absent param", () => {
  assertEquals(parseMarkParam(null), null);
});

Deno.test("null for empty string", () => {
  assertEquals(parseMarkParam(""), null);
});

Deno.test("single verse", () => {
  assertEquals(parseMarkParam("5"), new Set([5]));
});

Deno.test("range", () => {
  assertEquals(parseMarkParam("8-9"), new Set([8, 9]));
});

Deno.test("comma-separated verses and ranges", () => {
  assertEquals(parseMarkParam("3,6,8-9"), new Set([3, 6, 8, 9]));
});

Deno.test("null for invalid segment", () => {
  assertEquals(parseMarkParam("abc"), null);
});

Deno.test("null for reversed range", () => {
  assertEquals(parseMarkParam("9-5"), null);
});

Deno.test("null for zero or negative", () => {
  assertEquals(parseMarkParam("0"), null);
  assertEquals(parseMarkParam("-1"), null);
});
