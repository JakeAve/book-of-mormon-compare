import { assertEquals, assertLess } from "@std/assert";
import { tokenizeSource } from "../tokenize-source.ts";
import { groupByVerse, tokenizeTarget } from "../tokenize-target.ts";
import { runCursor } from "../cursor.ts";
import { runScaffoldAlign } from "../scaffold-align.ts";
import { buildAllVerseOutputs, type OutVerse } from "../build-output.ts";
import { verseKey } from "../line-key.ts";
import { getAdapter, type SourceAdapter } from "../sources/index.ts";
import { loadBooks } from "../../shared/bom2013.ts";
import { TARGET_ROOT } from "../../shared/paths.ts";
import { buildChapterReport } from "../../align/report.ts";

const FIXTURE_EXPECTED = new URL("fixtures/expected", import.meta.url).pathname;

interface TestCase {
  /** Fixture file basename (without .json). */
  slug: string;
  book: string;
  chapter: number;
}

interface VersionSuite {
  adapter: SourceAdapter;
  /** Directory under data/bom/ holding the aligner1 output for regression comparison. */
  aligner1Dir: string;
  chapters: TestCase[];
}

const SUITES: VersionSuite[] = [
  {
    adapter: getAdapter("pm")!,
    aligner1Dir: "data/bom/pm",
    chapters: [
      { slug: "pm/1-ne-3", book: "1-ne", chapter: 3 },
      { slug: "pm/1-ne-11", book: "1-ne", chapter: 11 },
      { slug: "pm/mosiah-23", book: "mosiah", chapter: 23 },
    ],
  },
  {
    adapter: getAdapter("1830")!,
    aligner1Dir: "data/bom/1830",
    chapters: [
      { slug: "1830/1-ne-3", book: "1-ne", chapter: 3 },
      // alma 32 exercises the dropped-clause tail-trim path (1830 omits a
      // ~40-word clause in v30 that later editions restored).
      { slug: "1830/alma-32", book: "alma", chapter: 32 },
      // alma 50 was completely broken before tail-trim (40/40 verses flagged).
      { slug: "1830/alma-50", book: "alma", chapter: 50 },
    ],
  },
  {
    adapter: getAdapter("1837")!,
    aligner1Dir: "data/bom/1837",
    chapters: [
      { slug: "1837/1-ne-3", book: "1-ne", chapter: 3 },
      // alma 32 is the top-flagged chapter in 1837-2; lock it in.
      { slug: "1837/alma-32", book: "alma", chapter: 32 },
      { slug: "1837/alma-50", book: "alma", chapter: 50 },
    ],
  },
  {
    adapter: getAdapter("om")!,
    aligner1Dir: "data/bom/om",
    chapters: [
      // Chapters where the OM adapter (scaffold algorithm) aligns most
      // cleanly per the token-purity audit.
      { slug: "om/1-ne-4", book: "1-ne", chapter: 4 },
      { slug: "om/1-ne-8", book: "1-ne", chapter: 8 },
      { slug: "om/hel-1", book: "hel", chapter: 1 },
      // 1-ne 9:2-3 exercises the multi-word boundary refinement: OM writes
      // canonical "Nevertheless" as three tokens `never the less` straddling
      // the 9:2/9:3 verse boundary. All three should land in 9:3.
      { slug: "om/1-ne-9", book: "1-ne", chapter: 9 },
    ],
  },
];

// Cache the per-suite pipeline output so all tests for one version share a run.
const outputCache = new Map<string, OutVerse[]>();

async function runPipeline(adapter: SourceAdapter): Promise<OutVerse[]> {
  const cached = outputCache.get(adapter.slug);
  if (cached) return cached;
  const allCanon = await loadBooks(TARGET_ROOT);
  const { words: sourceWords, lines: lineInfos } = await tokenizeSource(
    adapter.raw,
  );
  const targetWords = tokenizeTarget(allCanon);
  const verseGroups = groupByVerse(targetWords);
  const cursorResults = adapter.algorithm === "scaffold"
    ? runScaffoldAlign(sourceWords, verseGroups, lineInfos, {
      ngrams: [6, 4, 3],
      minTokensPerVerse: adapter.scaffoldMinTokensPerVerse ?? 3,
    })
    : runCursor(
      sourceWords,
      verseGroups,
      lineInfos,
      adapter.cursor,
      adapter.dictionary,
    );
  const canonByKey = new Map(
    allCanon.map((v) => [verseKey(v.book, v.chapter, v.verse), v.text]),
  );
  const out = buildAllVerseOutputs(cursorResults, lineInfos, canonByKey);
  outputCache.set(adapter.slug, out);
  return out;
}

function selectChapter(
  all: OutVerse[],
  book: string,
  chapter: number,
): OutVerse[] {
  return all.filter((v) => v.book === book && v.chapter === chapter);
}

for (const suite of SUITES) {
  for (const tc of suite.chapters) {
    Deno.test(
      `integration: aligner2 output matches expected fixture (${tc.slug})`,
      async () => {
        const all = await runPipeline(suite.adapter);
        const actual = selectChapter(all, tc.book, tc.chapter);
        const expected = JSON.parse(
          await Deno.readTextFile(`${FIXTURE_EXPECTED}/${tc.slug}.json`),
        );
        assertEquals(
          actual,
          expected,
          `Chapter ${tc.book} ${tc.chapter} output mismatch`,
        );
      },
    );
  }

  for (const tc of suite.chapters) {
    Deno.test(
      `regression: aligner2 fewer findings than aligner1 (${tc.slug})`,
      async () => {
        const allCanon = await loadBooks(TARGET_ROOT);
        const canonChapter = allCanon.filter(
          (v) => v.book === tc.book && v.chapter === tc.chapter,
        );

        const a2Output = JSON.parse(
          await Deno.readTextFile(`${FIXTURE_EXPECTED}/${tc.slug}.json`),
        );
        const a2Report = buildChapterReport({
          version: `${suite.adapter.slug}-2`,
          book: tc.book,
          chapter: tc.chapter,
          aligned: a2Output,
          canonical: canonChapter,
        });

        const a1Output = JSON.parse(
          await Deno.readTextFile(
            `${suite.aligner1Dir}/${tc.book}/${tc.chapter}.json`,
          ),
        );
        const a1Report = buildChapterReport({
          version: suite.adapter.slug,
          book: tc.book,
          chapter: tc.chapter,
          aligned: a1Output,
          canonical: canonChapter,
        });

        const a1Findings = a1Report.summary.versesWithFindings;
        const a2Findings = a2Report.summary.versesWithFindings;
        console.log(
          `  ${tc.slug}: aligner1=${a1Findings}/${a1Report.summary.totalVerses} aligner2=${a2Findings}/${a2Report.summary.totalVerses}`,
        );
        assertLess(
          a2Findings,
          a1Findings + 1,
          `Expected aligner2 (${a2Findings}) ≤ aligner1 (${a1Findings}) for ${tc.slug}`,
        );
      },
    );
  }
}
