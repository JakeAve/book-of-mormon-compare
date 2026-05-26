import { assertEquals } from "@std/assert";
import { createMatcher } from "./match.ts";

const m = createMatcher();

Deno.test("matches: exact normalized words", () => {
  assertEquals(m.matches("nephi", "nephi"), true);
  assertEquals(m.matchQuality("nephi", "nephi"), 1);
});

Deno.test("matches: level 2 — first/last letter + length (haveing → having)", () => {
  // h...g, lengths 7 vs 6: within ±2, same first 'h', same last 'g'
  assertEquals(m.matches("haveing", "having"), true);
  assertEquals(m.matchQuality("haveing", "having"), 2);
});

Deno.test("matches: level 2 — obediant → obedient", () => {
  // o...t, lengths 8 vs 8: exact length, same first 'o', same last 't'
  assertEquals(m.matches("obediant", "obedient"), true);
  assertEquals(m.matchQuality("obediant", "obedient"), 2);
});

Deno.test("matches: level 3 — Levenshtein catches edit distance variants", () => {
  // 'spak' vs 'spake': 1 edit, lengths 4 and 5 — threshold for len<=5 is 1
  assertEquals(m.matches("spak", "spake"), true);
  assertEquals(m.matchQuality("spak", "spake"), 3);
});

Deno.test("matches: level 4 — dictionary lookup", () => {
  // "behold" (6) vs "witness" (7): different first/last chars, lev distance 6 — fails levels 1-3.
  // Dictionary forces a match.
  const dictM = createMatcher(new Map([["behold", "witness"]]));
  assertEquals(dictM.matches("behold", "witness"), true);
  assertEquals(dictM.matchQuality("behold", "witness"), 4);
  // Default matcher (no dict) still rejects
  assertEquals(m.matches("behold", "witness"), false);
});

Deno.test("matches: returns false for clearly different words", () => {
  assertEquals(m.matches("nephi", "laman"), false);
  assertEquals(m.matches("wilderness", "jerusalem"), false);
  assertEquals(m.matchQuality("nephi", "laman"), 0);
});

Deno.test("matches: empty strings do not match", () => {
  assertEquals(m.matches("", "word"), false);
  assertEquals(m.matches("word", ""), false);
});

Deno.test("matches: short words require exact match — no level 2/3 fuzzy", () => {
  // 3-letter words with 1 char difference must NOT match
  assertEquals(m.matches("him", "hum"), false);
  assertEquals(m.matches("saw", "sow"), false);
  // exact short words still match
  assertEquals(m.matches("him", "him"), true);
});
