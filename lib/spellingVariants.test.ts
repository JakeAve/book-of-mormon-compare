import { assertEquals } from "@std/assert";
import { isKnownVariant } from "./spellingVariants.ts";

Deno.test("isKnownVariant: ampersand and 'and'", () => {
  assertEquals(isKnownVariant("&", "and"), true);
  assertEquals(isKnownVariant("and", "&"), true); // order-independent
});

Deno.test("isKnownVariant: saviour/savior", () => {
  assertEquals(isKnownVariant("saviour", "savior"), true);
});

Deno.test("isKnownVariant: unrelated words are not variants", () => {
  assertEquals(isKnownVariant("lord", "word"), false);
});

Deno.test("isKnownVariant: identical words are not 'variants'", () => {
  assertEquals(isKnownVariant("savior", "savior"), false);
});
