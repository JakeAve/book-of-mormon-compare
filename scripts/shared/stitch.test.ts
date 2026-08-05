import { assertEquals } from "@std/assert";
import { applyJoins, buildCanonIndex, decideJoin } from "./stitch.ts";

const CANON_1 =
  "And it came to pass that we did journey in the wilderness and a ship was built";

Deno.test("decideJoin - mid-word break is rejoined", () => {
  // "wildern" + "ess" → "wilderness" (fuzzy match in canon)
  const canon = buildCanonIndex(CANON_1);
  assertEquals(decideJoin("wildern", "ess", canon), "");
});

Deno.test("decideJoin - real bigram gets a space", () => {
  // "a ship" is a bigram in canon
  const canon = buildCanonIndex(CANON_1);
  assertEquals(decideJoin("a", "ship", canon), " ");
});

Deno.test("decideJoin - prefix+suffix where bigram is absent rejoins", () => {
  // "say" + "ing" → "saying"; "say ing" not a bigram
  const canon = buildCanonIndex("And he stood up saying unto them");
  assertEquals(decideJoin("say", "ing", canon), "");
});

Deno.test("decideJoin - compound-word split with no bigram rejoins", () => {
  // "where" + "fore" → "wherefore"; "where fore" not a bigram
  const canon = buildCanonIndex("wherefore he spake unto them");
  assertEquals(decideJoin("where", "fore", canon), "");
});

Deno.test("decideJoin - unknown junction defaults to space", () => {
  const canon = buildCanonIndex("apple zebra fruit");
  assertEquals(decideJoin("foo", "bar", canon), " ");
});

Deno.test("decideJoin - empty tail or head defaults to space", () => {
  const canon = buildCanonIndex("a b c");
  assertEquals(decideJoin("", "x", canon), " ");
  assertEquals(decideJoin("x", "", canon), " ");
});

Deno.test("applyJoins - mutates lines with correct trailing spaces", () => {
  const canon = buildCanonIndex(
    "And it came to pass that we did journey in the wilderness",
  );
  const lines = [
    { text: "And it came to pass that we" },
    { text: "did journey in the wildern" },
    { text: "ess thereof" },
  ];
  applyJoins(lines, canon);
  assertEquals(lines[0].text.endsWith(" "), true); // "we" / "did" → bigram
  assertEquals(lines[1].text.endsWith(" "), false); // "wildern" / "ess" → merged
});

Deno.test("applyJoins - line-wrap hyphen for a real canon word is stripped", () => {
  // "di-" + "d" → "did", a plain (non-hyphenated) canon word: the hyphen
  // was only the printer breaking "did" across the line.
  const canon = buildCanonIndex("and they did go forth");
  const lines = [
    { text: "and they di-" },
    { text: "d go forth" },
  ];
  applyJoins(lines, canon);
  assertEquals(lines[0].text, "and they di");
  assertEquals(lines[0].text.endsWith("-"), false);
});

Deno.test("applyJoins - genuine hyphenated compound keeps its hyphen", () => {
  // "judgment-" + "seat" merges to "judgmentseat", but canon has this word
  // as a hyphenated compound ("judgment-seat"), not a plain word — keep it.
  const canon = buildCanonIndex("he sat upon the judgment-seat and judged");
  const lines = [
    { text: "he sat upon the judgment-" },
    { text: "seat and judged" },
  ];
  applyJoins(lines, canon);
  assertEquals(lines[0].text.endsWith("-"), true);
});

Deno.test("applyJoins - unrecognized hyphenated merge defaults to keeping it", () => {
  // Merged form matches nothing in canon — safest default is to leave the
  // hyphen untouched rather than guess.
  const canon = buildCanonIndex("apple zebra fruit");
  const lines = [
    { text: "foo-" },
    { text: "bar" },
  ];
  applyJoins(lines, canon);
  assertEquals(lines[0].text.endsWith("-"), true);
});

Deno.test("decideJoin - global canon rejoins a word the verse canon lacks", () => {
  // 1837 reads "exceeding glad" where the 2013 verse has "exceedingly" —
  // the verse-scoped canon can't confirm "exceed" + "ing", but the full
  // corpus knows "exceeding" as a word.
  const canon = buildCanonIndex("she was exceedingly glad");
  const global = buildCanonIndex("with exceeding great joy");
  assertEquals(decideJoin("exceed", "ing", canon), " ");
  assertEquals(decideJoin("exceed", "ing", canon, global), "");
});

Deno.test("decideJoin - global bigram guards against a false global merge", () => {
  // The pair exists as two separate words elsewhere in canon — that is
  // evidence of a real word boundary, so the merged-word hit must not win.
  const canon = buildCanonIndex("apple zebra fruit");
  const global = buildCanonIndex("he found a way and went away");
  assertEquals(decideJoin("a", "way", canon, global), " ");
});

Deno.test("applyJoins - global canon strips a line-wrap hyphen", () => {
  const canon = buildCanonIndex("she was exceedingly glad");
  const global = buildCanonIndex("with exceeding great joy");
  const lines = [
    { text: "she was exceed-" },
    { text: "ing glad" },
  ];
  applyJoins(lines, canon, global);
  assertEquals(lines[0].text, "she was exceed");
});

Deno.test("applyJoins - global hyphenated compound keeps its hyphen", () => {
  const canon = buildCanonIndex("he sat upon it");
  const global = buildCanonIndex("before the judgment-seat of Christ");
  const lines = [
    { text: "he sat upon the judgment-" },
    { text: "seat" },
  ];
  applyJoins(lines, canon, global);
  assertEquals(lines[0].text.endsWith("-"), true);
});

Deno.test("applyJoins - markdown gets the same trailing space as text", () => {
  const canon = buildCanonIndex("a ship was built");
  const lines = [
    { text: "a", markdown: "{{a}}" },
    { text: "ship was built" },
  ];
  applyJoins(lines, canon);
  assertEquals(lines[0].text, "a ");
  assertEquals(lines[0].markdown, "{{a}} ");
});
