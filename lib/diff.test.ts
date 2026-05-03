import { assertEquals } from "jsr:@std/assert";
import { diff } from "./diff.ts";

Deno.test("diff: identical texts have no added or removed tokens", () => {
  const result = diff("hello world", "hello world");
  assertEquals(result.every((t) => !t.added && !t.removed), true);
});

Deno.test("diff: marks removed token", () => {
  const result = diff("hello world", "hello");
  const removed = result.filter((t) => t.removed);
  assertEquals(removed.length, 1);
  assertEquals(removed[0].value, "world");
});

Deno.test("diff: marks added token", () => {
  const result = diff("hello", "hello world");
  const added = result.filter((t) => t.added);
  assertEquals(added.length, 1);
  assertEquals(added[0].value, "world");
});

Deno.test("diff: unchanged tokens are marked neither added nor removed", () => {
  const result = diff("and it came", "and it passed");
  const unchanged = result.filter((t) => !t.added && !t.removed);
  assertEquals(unchanged.map((t) => t.value), ["and", "it"]);
});
