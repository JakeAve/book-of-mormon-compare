import { assertEquals } from "@std/assert";
import { tokenizeSource } from "../tokenize-source.ts";
import { groupByVerse, tokenizeTarget } from "../tokenize-target.ts";
import { runCursor } from "../cursor.ts";
import { buildAllVerseOutputs } from "../segment.ts";
import { loadBooks } from "../../align/sources/bom2013.ts";
import { TARGET_ROOT } from "../../align/paths.ts";

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
  const cursorResults = runCursor(sourceWords, verseGroups);
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
