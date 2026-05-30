import { assertEquals } from "@std/assert";
import { classifySubstitution } from "./diffClassify.ts";

Deno.test("classifySubstitution: case-only difference is capitalization", () => {
  assertEquals(classifySubstitution("And", "and"), "capitalization");
});

Deno.test("classifySubstitution: curated variant is spelling", () => {
  assertEquals(classifySubstitution("Saviour", "Savior"), "spelling");
  assertEquals(classifySubstitution("&", "and"), "spelling");
});

Deno.test("classifySubstitution: curated variant (thru/through) is spelling", () => {
  assertEquals(classifySubstitution("thru", "through"), "spelling");
});

Deno.test("classifySubstitution: edit-distance match is spelling (colour/color)", () => {
  assertEquals(classifySubstitution("colour", "color"), "spelling");
});

Deno.test("classifySubstitution: distant words are word change", () => {
  assertEquals(classifySubstitution("unto", "to"), "wordChange");
  assertEquals(classifySubstitution("lord", "word"), "wordChange");
});

Deno.test("classifySubstitution: punctuation-only is word change", () => {
  assertEquals(classifySubstitution(",", ";"), "wordChange");
});

Deno.test("classifySubstitution: case+spelling difference resolves to spelling", () => {
  assertEquals(classifySubstitution("Saviour", "savior"), "spelling");
});
