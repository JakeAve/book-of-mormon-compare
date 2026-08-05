import { diff, type Token } from "../lib/diff.ts";
import { stripManuscriptMarkup } from "../lib/manuscriptMarkup.ts";
import { BOOK_ORDER, loadChapter, type Verse } from "../lib/data.ts";
import { CHAPTER_COUNTS } from "../lib/bookChapters.ts";
import {
  CANONICAL_V1,
  CANONICAL_V2,
  DEFAULT_STATS_PATH,
} from "../lib/variantStats.ts";

export interface ChapterVariantStats {
  book: string;
  chapter: number;
  variantCount: number;
  changedVerseCount: number;
  totalVerseCount: number;
}

export interface VariantStatsFile {
  pair: { v1: string; v2: string };
  generatedAt: string;
  chapters: ChapterVariantStats[];
}

export function countVariantRuns(tokens: Token[]): number {
  let runs = 0;
  let inRun = false;
  for (const token of tokens) {
    const changed = token.added === true || token.removed === true;
    if (changed && !inRun) runs++;
    inRun = changed;
  }
  return runs;
}

function verseText(verse: Verse | undefined): string {
  if (!verse) return "";
  return stripManuscriptMarkup(verse.markdown ?? verse.text);
}

export function buildChapterStats(
  book: string,
  chapter: number,
  verses1: Verse[],
  verses2: Verse[],
): ChapterVariantStats | null {
  if (verses1.length === 0 || verses2.length === 0) return null;

  const totalVerseCount = Math.max(verses1.length, verses2.length);
  let variantCount = 0;
  let changedVerseCount = 0;

  for (let i = 0; i < totalVerseCount; i++) {
    const runs = countVariantRuns(
      diff(verseText(verses1[i]), verseText(verses2[i])),
    );
    if (runs > 0) {
      variantCount += runs;
      changedVerseCount++;
    }
  }

  return { book, chapter, variantCount, changedVerseCount, totalVerseCount };
}

async function main() {
  const chapters: ChapterVariantStats[] = [];
  let skipped = 0;

  for (const book of BOOK_ORDER) {
    for (let chapter = 1; chapter <= CHAPTER_COUNTS[book]; chapter++) {
      const [verses1, verses2] = await Promise.all([
        loadChapter(CANONICAL_V1, book, String(chapter)),
        loadChapter(CANONICAL_V2, book, String(chapter)),
      ]);
      const stats = buildChapterStats(book, chapter, verses1, verses2);
      if (stats) chapters.push(stats);
      else skipped++;
    }
  }

  const output: VariantStatsFile = {
    pair: { v1: CANONICAL_V1, v2: CANONICAL_V2 },
    generatedAt: new Date().toISOString().slice(0, 10),
    chapters,
  };

  await Deno.mkdir("data/stats", { recursive: true });
  await Deno.writeTextFile(
    DEFAULT_STATS_PATH,
    `${JSON.stringify(output, null, 2)}\n`,
  );

  console.log(`Wrote ${chapters.length} chapters to ${DEFAULT_STATS_PATH}`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} chapter(s) missing one side`);
  }
}

if (import.meta.main) await main();
