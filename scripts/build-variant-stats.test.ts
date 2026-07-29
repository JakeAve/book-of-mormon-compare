import { assertEquals } from "@std/assert";
import { buildChapterStats, countVariantRuns } from "./build-variant-stats.ts";
import { diff } from "../lib/diff.ts";
import type { Verse } from "../lib/data.ts";

function v(chapter: number, verse: number, text: string): Verse {
  return { chapter, verse, text };
}

Deno.test("countVariantRuns returns 0 for identical text", () => {
  assertEquals(
    countVariantRuns(diff("and it came to pass", "and it came to pass")),
    0,
  );
});

Deno.test("countVariantRuns counts a replaced phrase as one variant", () => {
  assertEquals(
    countVariantRuns(
      diff(
        "they became white and delightsome",
        "they became pure and delightsome",
      ),
    ),
    1,
  );
});

Deno.test("countVariantRuns counts a multi-word replacement as one variant", () => {
  assertEquals(
    countVariantRuns(diff("the mother of God", "the mother of the Son of God")),
    1,
  );
});

Deno.test("countVariantRuns counts separated changes independently", () => {
  assertEquals(
    countVariantRuns(
      diff("alpha bravo charlie delta echo", "alpha ZULU charlie delta YANKEE"),
    ),
    2,
  );
});

Deno.test("countVariantRuns counts a pure insertion as one variant", () => {
  assertEquals(
    countVariantRuns(diff("and it came to pass", "and it came to pass indeed")),
    1,
  );
});

Deno.test("buildChapterStats aggregates per-verse runs", () => {
  const verses1 = [
    v(5, 1, "and it came to pass"),
    v(5, 2, "they became white and delightsome"),
    v(5, 3, "alpha bravo charlie delta echo"),
  ];
  const verses2 = [
    v(5, 1, "and it came to pass"),
    v(5, 2, "they became pure and delightsome"),
    v(5, 3, "alpha ZULU charlie delta YANKEE"),
  ];

  assertEquals(buildChapterStats("alma", 5, verses1, verses2), {
    book: "alma",
    chapter: 5,
    variantCount: 3,
    changedVerseCount: 2,
    totalVerseCount: 3,
  });
});

Deno.test("buildChapterStats prefers markdown and strips manuscript markup", () => {
  // stripManuscriptMarkup only removes the marker characters (~~, {{, }}, [, ]),
  // not the struck-out text itself, so "white" survives as literal content and
  // registers as a removed word here — matching what components/Diff.tsx renders.
  const verses1 = [{
    chapter: 1,
    verse: 1,
    text: "ignored",
    markdown: "they became ~~white~~ pure and delightsome",
  }];
  const verses2 = [v(1, 1, "they became pure and delightsome")];

  assertEquals(buildChapterStats("1-ne", 1, verses1, verses2)?.variantCount, 1);
});

Deno.test("buildChapterStats returns null when either side is missing", () => {
  assertEquals(buildChapterStats("witnesses", 1, [], [v(1, 1, "text")]), null);
  assertEquals(buildChapterStats("witnesses", 1, [v(1, 1, "text")], []), null);
});

Deno.test("buildChapterStats counts unmatched verses as changed", () => {
  const verses1 = [v(1, 1, "same"), v(1, 2, "extra verse here")];
  const verses2 = [v(1, 1, "same")];

  assertEquals(buildChapterStats("1-ne", 1, verses1, verses2), {
    book: "1-ne",
    chapter: 1,
    variantCount: 1,
    changedVerseCount: 1,
    totalVerseCount: 2,
  });
});
