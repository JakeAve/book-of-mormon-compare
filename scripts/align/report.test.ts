import { assertEquals } from "@std/assert";
import { buildChapterReport, normalize } from "./report.ts";
import type { Verse } from "../../lib/data.ts";

function v(verse: number, text: string): Verse {
  return { chapter: 1, verse, text };
}

Deno.test("normalize lowercases and strips punctuation", () => {
  assertEquals(normalize("And it came, to pass!"), [
    "and",
    "it",
    "came",
    "to",
    "pass",
  ]);
});

Deno.test("clean alignment produces no findings", () => {
  const aligned = [v(1, "alpha beta gamma"), v(2, "delta epsilon zeta")];
  const canonical = aligned.map((x) => ({ ...x }));
  const report = buildChapterReport({
    version: "test",
    book: "1-ne",
    chapter: 1,
    aligned,
    canonical,
  });
  assertEquals(report.summary.versesWithFindings, 0);
});

Deno.test("trailing bleed: verse 1 contains the start of canonical verse 2", () => {
  const aligned = [
    v(1, "alpha beta gamma delta epsilon zeta"),
    v(2, "eta theta iota"),
  ];
  const canonical = [
    v(1, "alpha beta gamma"),
    v(2, "delta epsilon zeta eta theta iota"),
  ];
  const report = buildChapterReport({
    version: "test",
    book: "1-ne",
    chapter: 1,
    aligned,
    canonical,
  });
  const v1 = report.verses.find((x) => x.verse === 1)!;
  const trailing = v1.findings.find((f) => f.type === "trailing-bleed");
  assertEquals(trailing?.intoVerse, 2);
  assertEquals(trailing?.tokens, ["delta", "epsilon", "zeta"]);
});

Deno.test("leading bleed: verse 2 starts with content from verse 1", () => {
  const aligned = [
    v(1, "alpha beta"),
    v(2, "gamma delta epsilon zeta eta theta"),
  ];
  const canonical = [
    v(1, "alpha beta gamma delta epsilon"),
    v(2, "zeta eta theta"),
  ];
  const report = buildChapterReport({
    version: "test",
    book: "1-ne",
    chapter: 1,
    aligned,
    canonical,
  });
  const v2 = report.verses.find((x) => x.verse === 2)!;
  const leading = v2.findings.find((f) => f.type === "leading-bleed");
  assertEquals(leading?.intoVerse, 1);
  assertEquals(leading?.tokens, ["gamma", "delta", "epsilon"]);
});

Deno.test("chapter bleed: last verse trails into next chapter", () => {
  const aligned = [v(1, "alpha beta gamma delta epsilon zeta eta")];
  const canonical = [v(1, "alpha beta gamma")];
  const next = [{ chapter: 2, verse: 1, text: "delta epsilon zeta eta" }];
  const report = buildChapterReport({
    version: "test",
    book: "1-ne",
    chapter: 1,
    aligned,
    canonical,
    nextCanonical: next,
    nextChapter: 2,
  });
  const v1 = report.verses[0];
  const cb = v1.findings.find((f) => f.type === "chapter-bleed");
  assertEquals(cb?.intoChapter, 2);
});
