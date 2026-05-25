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

Deno.test("applyJoins - hyphenated tail leaves no trailing space", () => {
  const canon = buildCanonIndex("and they did go forth");
  const lines = [
    { text: "and they di-" },
    { text: "d go forth" },
  ];
  applyJoins(lines, canon);
  assertEquals(lines[0].text.endsWith("-"), true);
  assertEquals(lines[0].text.endsWith(" "), false);
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
