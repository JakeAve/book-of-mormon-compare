import { assertEquals } from "@std/assert";
import { KINDS } from "./DiffTypeFilter.tsx";

Deno.test("legend chips are in alphabetical order", () => {
  const labels = KINDS.map((k) => k.label);
  assertEquals(labels, [...labels].sort((a, b) => a.localeCompare(b)));
});

Deno.test("every diff kind has a legend entry", () => {
  assertEquals(
    new Set(KINDS.map((k) => k.kind)),
    new Set([
      "capitalization",
      "punctuation",
      "spelling",
      "addition",
      "omission",
      "wordChange",
    ]),
  );
});
