import { assertEquals } from "@std/assert";
import {
  buildIssueBody,
  buildIssueTitle,
  type CorrectionReport,
  parseCorrectionReport,
  parseVersesInput,
} from "@/lib/correctionReport.ts";

const valid: Record<string, unknown> = {
  version: "1830",
  comparedWith: "2013",
  book: "1-ne",
  chapter: 4,
  verses: [17, 18],
  errorType: "verse-boundary",
  selectedText: "command ments",
  expectedText: "commandments (in verse 17)",
  description: "",
  url: "https://bofm.scripturecompare.org/1-ne/4?v1=1830&v2=2013",
};

Deno.test("parseCorrectionReport — accepts a valid payload", () => {
  const result = parseCorrectionReport(valid);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.report.book, "1-ne");
    assertEquals(result.report.verses, [17, 18]);
  }
});

Deno.test("parseCorrectionReport — accepts version 'unsure'", () => {
  const result = parseCorrectionReport({ ...valid, version: "unsure" });
  assertEquals(result.ok, true);
});

Deno.test("parseCorrectionReport — rejects bad inputs", () => {
  const bad: Array<Record<string, unknown> | string | null> = [
    { ...valid, version: "1999" },
    { ...valid, comparedWith: "nope" },
    { ...valid, book: "genesis" },
    { ...valid, chapter: 0 },
    { ...valid, chapter: 99 }, // 1-ne has 22 chapters
    { ...valid, verses: [] },
    { ...valid, verses: [1.5] },
    { ...valid, verses: Array.from({ length: 21 }, (_, i) => i + 1) },
    { ...valid, errorType: "vibes" },
    { ...valid, selectedText: "x".repeat(501) },
    { ...valid, expectedText: "x".repeat(501) },
    { ...valid, description: "x".repeat(2001) },
    { ...valid, url: "x".repeat(501) },
    { ...valid, url: "javascript:alert(1)" },
    { ...valid, url: "https://x.com/a\n\n## injected" },
    { ...valid, url: "not a url" },
    "not an object",
    null,
  ];
  for (const input of bad) {
    assertEquals(
      parseCorrectionReport(input).ok,
      false,
      `expected rejection: ${JSON.stringify(input).slice(0, 80)}`,
    );
  }
});

Deno.test("parseCorrectionReport — sorts and dedupes verses", () => {
  const result = parseCorrectionReport({ ...valid, verses: [18, 17, 18] });
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.report.verses, [17, 18]);
});

Deno.test("buildIssueTitle — formats version, book, verse range", () => {
  const r =
    (parseCorrectionReport(valid) as { ok: true; report: CorrectionReport })
      .report;
  assertEquals(buildIssueTitle(r), "[correction] 1830 — 1 Nephi 4:17–18");
});

Deno.test("buildIssueTitle — single verse and unsure version", () => {
  const r =
    (parseCorrectionReport({ ...valid, version: "unsure", verses: [9] }) as {
      ok: true;
      report: CorrectionReport;
    }).report;
  assertEquals(buildIssueTitle(r), "[correction] unsure — 1 Nephi 4:9");
});

Deno.test("buildIssueBody — contains prose summary and parseable json block", () => {
  const r =
    (parseCorrectionReport(valid) as { ok: true; report: CorrectionReport })
      .report;
  const body = buildIssueBody(r);
  const match = body.match(/```json\n([\s\S]+?)\n```/);
  assertEquals(match !== null, true);
  const parsed = JSON.parse(match![1]) as CorrectionReport;
  assertEquals(parsed.version, "1830");
  assertEquals(parsed.verses, [17, 18]);
  assertEquals(parsed.errorType, "verse-boundary");
  assertEquals(body.includes("1830 First Edition"), true);
  assertEquals(body.includes("1 Nephi 4:17–18"), true);
  assertEquals(body.includes("> command ments"), true);
  assertEquals(body.includes(valid.url as string), true);
});

Deno.test("parseVersesInput — single, range, list, garbage", () => {
  assertEquals(parseVersesInput("17"), [17]);
  assertEquals(parseVersesInput("17-18"), [17, 18]);
  assertEquals(parseVersesInput("17–19"), [17, 18, 19]);
  assertEquals(parseVersesInput(" 17, 18 "), [17, 18]);
  assertEquals(parseVersesInput(""), null);
  assertEquals(parseVersesInput("abc"), null);
  assertEquals(parseVersesInput("18-17"), null);
});
