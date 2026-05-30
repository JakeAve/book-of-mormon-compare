import { assertEquals } from "@std/assert";
import { classifyDiff, classifySubstitution } from "./diffClassify.ts";
import type { Token } from "./diff.ts";

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

Deno.test("classifyDiff: pure added token is addition", () => {
  const tokens: Token[] = [
    { value: "hello", added: false, removed: false },
    { value: "world", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[1].kind, "addition");
  assertEquals(tokens[0].kind, undefined);
});

Deno.test("classifyDiff: pure removed token is omission", () => {
  const tokens: Token[] = [
    { value: "hello", added: false, removed: false },
    { value: "world", removed: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[1].kind, "omission");
});

Deno.test("classifyDiff: removed+added pair is a substitution (capitalization)", () => {
  const tokens: Token[] = [
    { value: "And", removed: true },
    { value: "and", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "capitalization");
  assertEquals(tokens[1].kind, "capitalization");
});

Deno.test("classifyDiff: uneven run pairs then labels leftovers", () => {
  // 2 removed, 1 added => 1 substitution + 1 omission
  const tokens: Token[] = [
    { value: "great", removed: true },
    { value: "big", removed: true },
    { value: "grand", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "wordChange"); // great vs grand
  assertEquals(tokens[1].kind, "omission"); // big has no partner
  assertEquals(tokens[2].kind, "wordChange");
});

Deno.test("classifyDiff: interleaved removed/added/removed region", () => {
  const tokens: Token[] = [
    { value: "a", removed: true },
    { value: "b", added: true },
    { value: "c", removed: true },
  ];
  classifyDiff(tokens);
  // collected removed=[a,c], added=[b]; pair (a,b) -> wordChange, c leftover -> omission
  assertEquals(tokens[0].kind, "wordChange");
  assertEquals(tokens[1].kind, "wordChange");
  assertEquals(tokens[2].kind, "omission");
});

Deno.test("classifyDiff: multiple disjoint change regions are classified independently", () => {
  const tokens: Token[] = [
    { value: "keep", added: false, removed: false },
    { value: "extra", added: true },
    { value: "same", added: false, removed: false },
    { value: "old", removed: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, undefined);
  assertEquals(tokens[1].kind, "addition");
  assertEquals(tokens[2].kind, undefined);
  assertEquals(tokens[3].kind, "omission");
});
