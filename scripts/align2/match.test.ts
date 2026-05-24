import { assertEquals } from "@std/assert";
import {
  addDictionaryEntry,
  clearDictionary,
  matches,
  matchQuality,
} from "./match.ts";

Deno.test("matches: exact normalized words", () => {
  assertEquals(matches("nephi", "nephi"), true);
  assertEquals(matchQuality("nephi", "nephi"), 1);
});

Deno.test("matches: level 2 — first/last letter + length (haveing → having)", () => {
  // h...g, lengths 7 vs 6: within ±2, same first 'h', same last 'g'
  assertEquals(matches("haveing", "having"), true);
  assertEquals(matchQuality("haveing", "having"), 2);
});

Deno.test("matches: level 2 — obediant → obedient", () => {
  // o...t, lengths 8 vs 8: exact length, same first 'o', same last 't'
  assertEquals(matches("obediant", "obedient"), true);
  assertEquals(matchQuality("obediant", "obedient"), 2);
});

Deno.test("matches: level 3 — Levenshtein catches edit distance variants", () => {
  // 'spak' vs 'spake': 1 edit, lengths 4 and 5 — threshold for len<=5 is 1
  assertEquals(matches("spak", "spake"), true);
  assertEquals(matchQuality("spak", "spake"), 3);
});

Deno.test("matches: level 4 — dictionary lookup", () => {
  clearDictionary();
  // "thereof" vs "thereon": same first 't', last 'f' vs 'n' — fails level 2.
  // Levenshtein distance is 2, max length is 7, threshold for len<=9 is 2 — would pass level 3.
  // Use a pair with no structural similarity: "yea" vs "yes" passes level 2 (a vs s, different).
  // Use "wo" (2 chars) vs "woe" (3 chars): same first 'w', last 'o' vs 'e' — fails level 2.
  // Levenshtein("wo","woe")=1, max len=3 <=5, threshold=1 — passes level 3.
  // Need a pair that truly fails all 3: different first char, different last char, high edit distance.
  // "behold" (6) vs "witness" (7): b vs w, d vs s, len diff=1 — fails level 2. lev=6 > threshold 2 — fails level 3.
  addDictionaryEntry("behold", "witness");
  assertEquals(matches("behold", "witness"), true);
  assertEquals(matchQuality("behold", "witness"), 4);
  clearDictionary();
});

Deno.test("matches: returns false for clearly different words", () => {
  assertEquals(matches("nephi", "laman"), false);
  assertEquals(matches("wilderness", "jerusalem"), false);
  assertEquals(matchQuality("nephi", "laman"), 0);
});

Deno.test("matches: empty strings do not match", () => {
  assertEquals(matches("", "word"), false);
  assertEquals(matches("word", ""), false);
});

Deno.test("matches: short words require exact match — no level 2/3 fuzzy", () => {
  // 3-letter words with 1 char difference must NOT match
  assertEquals(matches("him", "hum"), false);
  assertEquals(matches("saw", "sow"), false);
  // exact short words still match
  assertEquals(matches("him", "him"), true);
});
