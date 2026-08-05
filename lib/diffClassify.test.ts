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

Deno.test("classifySubstitution: punctuation swap is punctuation", () => {
  assertEquals(classifySubstitution(",", ";"), "punctuation");
  assertEquals(classifySubstitution(".", ","), "punctuation");
});

Deno.test("classifySubstitution: word against punctuation is punctuation", () => {
  assertEquals(classifySubstitution("his", ","), "punctuation");
  assertEquals(classifySubstitution(".", "never"), "punctuation");
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

Deno.test("classifyDiff: added punctuation is punctuation, not addition", () => {
  const tokens: Token[] = [
    { value: "word", added: false, removed: false },
    { value: ",", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[1].kind, "punctuation");
});

Deno.test("classifyDiff: removed punctuation is punctuation, not omission", () => {
  const tokens: Token[] = [
    { value: "word", added: false, removed: false },
    { value: ";", removed: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[1].kind, "punctuation");
});

Deno.test("classifyDiff: punctuation never consumes a word pairing slot", () => {
  // The corpus bug: a leftover word zipped to a leftover comma became wordChange.
  const tokens: Token[] = [
    { value: "his", removed: true },
    { value: ",", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "omission");
  assertEquals(tokens[1].kind, "punctuation");
});

Deno.test("classifyDiff: real substitution still pairs across added punctuation", () => {
  const tokens: Token[] = [
    { value: "author", removed: true },
    { value: ",", added: true },
    { value: "translator", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "wordChange");
  assertEquals(tokens[1].kind, "punctuation");
  assertEquals(tokens[2].kind, "wordChange");
});

Deno.test("classifyDiff: & is a spelling variant, not punctuation", () => {
  const tokens: Token[] = [
    { value: "&", removed: true },
    { value: "and", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "spelling");
  assertEquals(tokens[1].kind, "spelling");
});

Deno.test("classifySubstitution: short manuscript spellings bypass the length gate", () => {
  assertEquals(classifySubstitution("shew", "show"), "spelling");
  assertEquals(classifySubstitution("thot", "that"), "spelling");
  assertEquals(classifySubstitution("ore", "are"), "spelling");
  assertEquals(classifySubstitution("woe", "wo"), "spelling");
  assertEquals(classifySubstitution("domb", "dumb"), "spelling");
  assertEquals(classifySubstitution("oar", "ore"), "spelling");
});

Deno.test("classifySubstitution: short grammatical changes stay word changes", () => {
  assertEquals(classifySubstitution("hath", "has"), "wordChange");
  assertEquals(classifySubstitution("doth", "do"), "wordChange");
  assertEquals(classifySubstitution("came", "come"), "wordChange");
});

Deno.test("classifyDiff: pm two words vs 2013 one word is a spelling difference", () => {
  const tokens: Token[] = [
    { value: "first", removed: true },
    { value: "born", removed: true },
    { value: "firstborn", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens.map((t) => t.kind), ["spelling", "spelling", "spelling"]);
});

Deno.test("classifyDiff: pm one word vs 2013 two words is a spelling difference", () => {
  const tokens: Token[] = [
    { value: "Judgmentseat", removed: true },
    { value: "judgment", added: true },
    { value: "seat", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens.map((t) => t.kind), ["spelling", "spelling", "spelling"]);
});

Deno.test("classifyDiff: word division ignores an added hyphen", () => {
  const tokens: Token[] = [
    { value: "allpowerful", removed: true },
    { value: "all", added: true },
    { value: "-", added: true },
    { value: "powerful", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "spelling");
  assertEquals(tokens[1].kind, "spelling");
  assertEquals(tokens[2].kind, "punctuation");
  assertEquals(tokens[3].kind, "spelling");
});

Deno.test("classifyDiff: word division is not claimed when letters differ", () => {
  const tokens: Token[] = [
    { value: "first", removed: true },
    { value: "born", removed: true },
    { value: "firstling", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens.every((t) => t.kind === "spelling"), false);
});

Deno.test("classifyDiff: a one-for-one pair is untouched by the division rule", () => {
  const tokens: Token[] = [
    { value: "Gentile", removed: true },
    { value: "gentile", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "capitalization");
});

Deno.test("classifyDiff: equal-length run of case-only changes stays capitalization", () => {
  const tokens: Token[] = [
    { value: "holy", removed: true },
    { value: "one", removed: true },
    { value: "Holy", added: true },
    { value: "One", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens.map((t) => t.kind), [
    "capitalization",
    "capitalization",
    "capitalization",
    "capitalization",
  ]);
});

Deno.test("classifyDiff: leftover pairs with the most similar candidate, not the first", () => {
  // pm "streached" vs 2013 "is stretched": pairing positionally gave
  // streached -> is (wordChange) and stranded the real spelling variant.
  const tokens: Token[] = [
    { value: "streached", removed: true },
    { value: "is", added: true },
    { value: "stretched", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "spelling");
  assertEquals(tokens[1].kind, "addition");
  assertEquals(tokens[2].kind, "spelling");
});

Deno.test("classifyDiff: a genuine word change with one candidate still pairs", () => {
  const tokens: Token[] = [
    { value: "which", removed: true },
    { value: "who", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[0].kind, "wordChange");
  assertEquals(tokens[1].kind, "wordChange");
});

Deno.test("classifyDiff: a near-identical pair is not stolen by an earlier token", () => {
  const tokens: Token[] = [
    { value: "yea", removed: true },
    { value: "destroied", removed: true },
    { value: "destroyed", added: true },
  ];
  classifyDiff(tokens);
  assertEquals(tokens[1].kind, "spelling"); // destroied <-> destroyed
  assertEquals(tokens[0].kind, "omission"); // yea has no partner
});

Deno.test("classifySubstitution: curated spellings the distance gate cannot reach", () => {
  assertEquals(classifySubstitution("Desipels", "disciples"), "spelling");
  assertEquals(classifySubstitution("plane", "plain"), "spelling");
  assertEquals(classifySubstitution("bourn", "borne"), "spelling");
  assertEquals(classifySubstitution("tho", "though"), "spelling");
});

Deno.test("classifySubstitution: grammar the gate correctly refuses", () => {
  // These sit at the same edit distance as the curated pairs above; loosening
  // the ratio to reach the pairs above would wrongly claim all of these.
  assertEquals(classifySubstitution("saith", "said"), "wordChange");
  assertEquals(classifySubstitution("their", "the"), "wordChange");
  assertEquals(classifySubstitution("wrote", "written"), "wordChange");
});
