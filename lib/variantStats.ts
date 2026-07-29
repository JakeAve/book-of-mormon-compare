import { log } from "./logger.ts";
import { VERSION_SHORT_NAMES } from "./data.ts";

export const CANONICAL_V1 = "pm";
export const CANONICAL_V2 = "2013";

const V1_NAME = VERSION_SHORT_NAMES[CANONICAL_V1];
const V2_NAME = VERSION_SHORT_NAMES[CANONICAL_V2];

const DEFAULT_STATS_PATH = "data/stats/variants.json";
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 155;
const SITE_SUFFIX = " | Book of Mormon Compare";

export interface ChapterVariantStats {
  book: string;
  chapter: number;
  variantCount: number;
  changedVerseCount: number;
  totalVerseCount: number;
}

export interface VariantStats {
  generatedAt: string;
  forChapter(
    book: string,
    chapter: string | number,
  ): ChapterVariantStats | null;
  forBook(book: string): ChapterVariantStats[];
}

interface VariantStatsFile {
  pair: { v1: string; v2: string };
  generatedAt: string;
  chapters: ChapterVariantStats[];
}

export function isCanonicalPair(v1: string, v2: string): boolean {
  return v1 === CANONICAL_V1 && v2 === CANONICAL_V2;
}

const EMPTY_STATS: VariantStats = {
  generatedAt: "",
  forChapter: () => null,
  forBook: () => [],
};

const cache = new Map<string, Promise<VariantStats>>();

export function loadVariantStats(
  path = DEFAULT_STATS_PATH,
): Promise<VariantStats> {
  const cached = cache.get(path);
  if (cached) return cached;
  const pending = readStats(path);
  cache.set(path, pending);
  return pending;
}

async function readStats(path: string): Promise<VariantStats> {
  let file: VariantStatsFile;
  try {
    file = JSON.parse(await Deno.readTextFile(path)) as VariantStatsFile;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      log("error", "variant_stats_load_error", {
        path,
        error: (err as Error).message,
      });
    }
    return EMPTY_STATS;
  }

  const byChapter = new Map<string, ChapterVariantStats>();
  const byBook = new Map<string, ChapterVariantStats[]>();
  for (const record of file.chapters) {
    byChapter.set(`${record.book}/${record.chapter}`, record);
    const list = byBook.get(record.book) ?? [];
    list.push(record);
    byBook.set(record.book, list);
  }
  for (const list of byBook.values()) {
    list.sort((a, b) => a.chapter - b.chapter);
  }

  return {
    generatedAt: file.generatedAt,
    forChapter: (book, chapter) =>
      byChapter.get(`${book}/${Number(chapter)}`) ?? null,
    forBook: (book) => byBook.get(book) ?? [],
  };
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function chapterTitle(
  stats: ChapterVariantStats,
  bookName: string,
): string {
  const core = stats.variantCount === 0
    ? `${bookName} ${stats.chapter} — No Textual Differences`
    : `${bookName} ${stats.chapter} — ${stats.variantCount} Textual ${
      plural(stats.variantCount, "Difference", "Differences")
    }`;
  const full = `${core}${SITE_SUFFIX}`;
  return full.length <= MAX_TITLE_LENGTH ? full : core;
}

export function chapterDescription(
  stats: ChapterVariantStats,
  bookName: string,
): string {
  const body = stats.variantCount === 0
    ? `${bookName} ${stats.chapter} has no textual differences between the ${V1_NAME} and the ${V2_NAME} across its ${stats.totalVerseCount} verses.`
    : `${bookName} ${stats.chapter} has ${stats.variantCount} textual ${
      plural(stats.variantCount, "difference", "differences")
    } across ${stats.changedVerseCount} of ${stats.totalVerseCount} verses between the ${V1_NAME} and the ${V2_NAME}.`;
  const withTag = `${body} Compare both witnesses word by word.`;
  return withTag.length <= MAX_DESCRIPTION_LENGTH ? withTag : body;
}

export function chapterSummarySentence(stats: ChapterVariantStats): string {
  if (stats.variantCount === 0) {
    return `No textual differences between the ${V1_NAME} and the ${V2_NAME} in this chapter.`;
  }
  const differences = `${stats.variantCount} ${
    plural(stats.variantCount, "difference", "differences")
  }`;
  const scope = stats.changedVerseCount === 1
    ? "in 1 verse"
    : `across ${stats.changedVerseCount} verses`;
  return `${differences} ${scope} between the ${V1_NAME} and the ${V2_NAME}.`;
}

export function bookIntroSentences(
  bookName: string,
  chapters: ChapterVariantStats[],
): string[] {
  const totalVariants = chapters.reduce((n, c) => n + c.variantCount, 0);
  const totalVerses = chapters.reduce((n, c) => n + c.totalVerseCount, 0);
  const changedVerses = chapters.reduce((n, c) => n + c.changedVerseCount, 0);
  const chapterLabel = `${chapters.length} ${
    plural(chapters.length, "chapter", "chapters")
  }`;

  if (totalVariants === 0) {
    return [
      `${bookName} carries no textual differences across ${chapterLabel} when the ${V1_NAME} is set against the ${V2_NAME}.`,
      `All ${totalVerses} of its verses read identically in both witnesses.`,
    ];
  }

  const busiest = chapters.reduce((a, b) =>
    b.variantCount > a.variantCount ? b : a
  );

  return [
    `${bookName} carries ${totalVariants} textual ${
      plural(totalVariants, "difference", "differences")
    } across ${chapterLabel} when the ${V1_NAME} is set against the ${V2_NAME}.`,
    `${busiest.variantCount} of those fall in chapter ${busiest.chapter}, the most varied chapter in the book; ${changedVerses} of its ${totalVerses} verses differ in total.`,
  ];
}
