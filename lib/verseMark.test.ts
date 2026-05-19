import { assertEquals } from "@std/assert";
import { parseMarkParam, serializeMarkParam } from "./verseMark.ts";

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

Deno.test("serialize single verse", () => {
  assertEquals(serializeMarkParam(new Set([5])), "5");
});

Deno.test("serialize consecutive verses as range", () => {
  assertEquals(serializeMarkParam(new Set([3, 4, 5])), "3-5");
});

Deno.test("serialize non-consecutive verses as comma list", () => {
  assertEquals(serializeMarkParam(new Set([1, 3, 5])), "1,3,5");
});

Deno.test("serialize mixed ranges and singles", () => {
  assertEquals(serializeMarkParam(new Set([1, 2, 4, 6, 7, 8])), "1-2,4,6-8");
});

Deno.test("serialize is round-trip stable with parseMarkParam", () => {
  const original = new Set([3, 4, 5, 9]);
  const serialized = serializeMarkParam(original);
  assertEquals(parseMarkParam(serialized), original);
});
