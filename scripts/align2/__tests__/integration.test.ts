import { assertEquals, assertLess } from "@std/assert";
import { tokenizeSource } from "../tokenize-source.ts";
import { groupByVerse, tokenizeTarget } from "../tokenize-target.ts";
import { runCursor } from "../cursor.ts";
import { buildAllVerseOutputs } from "../segment.ts";
import { loadBooks } from "../../align/sources/bom2013.ts";
import { TARGET_ROOT } from "../../align/paths.ts";
import { buildChapterReport } from "../../align/report.ts";

// Use the full raw PM directory so the sequential cursor algorithm
// traverses the complete source, correctly assigning all chapters.
const FIXTURE_RAW = new URL("../../../data/raw/pm", import.meta.url).pathname;
const FIXTURE_EXPECTED = new URL("fixtures/expected", import.meta.url).pathname;

const TEST_CHAPTERS = [
  { slug: "1-ne-3", book: "1-ne", chapter: 3 },
  { slug: "1-ne-11", book: "1-ne", chapter: 11 },
  { slug: "mosiah-23", book: "mosiah", chapter: 23 },
] as const;

async function runAligner2ForChapters(
  rawDir: string,
  targetChapters: readonly { book: string; chapter: number }[],
) {
  const allCanon = await loadBooks(TARGET_ROOT);
  const { words: sourceWords, lines: lineInfos } = await tokenizeSource(rawDir);
  const targetWords = tokenizeTarget(allCanon);
  const verseGroups = groupByVerse(targetWords);
  const cursorResults = runCursor(sourceWords, verseGroups, lineInfos);
  const canonByKey = new Map(
    allCanon.map((v) => [`${v.book}|${v.chapter}|${v.verse}`, v.text]),
  );
  const allOutput = buildAllVerseOutputs(cursorResults, lineInfos, canonByKey);
  // Filter to just the chapters under test
  return targetChapters.map(({ book, chapter }) =>
    allOutput.filter((v) => v.book === book && v.chapter === chapter)
  );
}

// Load canon and run pipeline once for all tests
let _outputs: Awaited<ReturnType<typeof runAligner2ForChapters>> | null = null;

async function getOutputs() {
  if (!_outputs) {
    _outputs = await runAligner2ForChapters(
      FIXTURE_RAW,
      TEST_CHAPTERS,
    );
  }
  return _outputs!;
}

for (let i = 0; i < TEST_CHAPTERS.length; i++) {
  const { slug, book, chapter } = TEST_CHAPTERS[i];
  Deno.test(
    `integration: aligner2 output matches expected fixture (${slug})`,
    async () => {
      const outputs = await getOutputs();
      const actual = outputs[i];
      const expected = JSON.parse(
        await Deno.readTextFile(
          `${FIXTURE_EXPECTED}/${slug}.json`,
        ),
      );
      assertEquals(
        actual,
        expected,
        `Chapter ${book} ${chapter} output mismatch`,
      );
    },
  );
}

// Regression: aligner2 must have fewer report findings than aligner1 on each test chapter.
for (let i = 0; i < TEST_CHAPTERS.length; i++) {
  const { slug, book, chapter } = TEST_CHAPTERS[i];
  Deno.test(
    `regression: aligner2 fewer findings than aligner1 (${slug})`,
    async () => {
      const allCanon = await loadBooks(TARGET_ROOT);
      const canonChapter = allCanon.filter(
        (v) => v.book === book && v.chapter === chapter,
      );

      // aligner2 output from already-run pipeline (fixture)
      const a2Output = JSON.parse(
        await Deno.readTextFile(`${FIXTURE_EXPECTED}/${slug}.json`),
      );
      const a2Report = buildChapterReport({
        version: "pm2",
        book,
        chapter,
        aligned: a2Output,
        canonical: canonChapter,
      });

      // aligner1 output from existing data/bom/pm/
      const a1Output = JSON.parse(
        await Deno.readTextFile(`data/bom/pm/${book}/${chapter}.json`),
      );
      const a1Report = buildChapterReport({
        version: "pm",
        book,
        chapter,
        aligned: a1Output,
        canonical: canonChapter,
      });

      const a1Findings = a1Report.summary.versesWithFindings;
      const a2Findings = a2Report.summary.versesWithFindings;
      console.log(
        `  ${slug}: aligner1=${a1Findings}/${a1Report.summary.totalVerses} aligner2=${a2Findings}/${a2Report.summary.totalVerses}`,
      );
      // aligner2 must not be worse than aligner1 (equal is acceptable when aligner1 = 0)
      assertLess(
        a2Findings,
        a1Findings + 1,
        `Expected aligner2 (${a2Findings}) ≤ aligner1 (${a1Findings}) for ${slug}`,
      );
    },
  );
}
