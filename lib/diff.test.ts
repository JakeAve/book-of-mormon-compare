import { assertEquals } from "@std/assert";
import { diff, diffVersesPaired } from "./diff.ts";

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

Deno.test("diffVersesPaired: returns one token array per verse pair", () => {
  const verses1 = ["and it came to pass", "behold the words"];
  const verses2 = ["and it came to pass", "behold the words"];
  const result = diffVersesPaired(verses1, verses2);
  assertEquals(result.length, 2);
});

Deno.test("diffVersesPaired: changes in one verse do not affect other verses", () => {
  const verses1 = ["and it came to pass", "behold the words"];
  const verses2 = ["and it came to pass", "behold these words"];
  const result = diffVersesPaired(verses1, verses2);
  assertEquals(result[0].every((t) => !t.added && !t.removed), true);
  const removed = result[1].filter((t) => t.removed);
  const added = result[1].filter((t) => t.added);
  assertEquals(removed[0].value, "the");
  assertEquals(added[0].value, "these");
});

Deno.test("diffVersesPaired: treats missing verse2 as empty (all removed)", () => {
  const result = diffVersesPaired(["extra verse"], []);
  assertEquals(result.length, 1);
  assertEquals(result[0].every((t) => t.removed), true);
});

Deno.test("diffVersesPaired: treats missing verse1 as empty (all added)", () => {
  const result = diffVersesPaired([], ["extra verse"]);
  assertEquals(result.length, 1);
  assertEquals(result[0].every((t) => t.added), true);
});
