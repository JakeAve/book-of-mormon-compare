import { log } from "./logger.ts";
import { VERSION_SHORT_NAMES } from "./data.ts";

export const CANONICAL_V1 = "pm";
export const CANONICAL_V2 = "2013";

const V1_NAME = VERSION_SHORT_NAMES[CANONICAL_V1];
const V2_NAME = VERSION_SHORT_NAMES[CANONICAL_V2];

export const DEFAULT_STATS_PATH = "data/stats/variants.json";
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 155;
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
    if (err instanceof Deno.errors.NotFound) {
      log("error", "variant_stats_not_found", { path });
    } else {
      log("error", "variant_stats_load_error", {
        path,
        error: (err as Error).message,
      });
    }
    return EMPTY_STATS;
  }

  if (
    file.pair.v1 !== CANONICAL_V1 || file.pair.v2 !== CANONICAL_V2
  ) {
    log("error", "variant_stats_pair_mismatch", {
      path,
      expected: { v1: CANONICAL_V1, v2: CANONICAL_V2 },
      actual: file.pair,
    });
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

export function formatCount(count: number): string {
  return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function verseLabel(count: number): string {
  return count === 1 ? "1 verse" : `${formatCount(count)} verses`;
}

export function bookHubTitle(bookName: string): string {
  const core = `${bookName} — Textual Variants by Chapter`;
  const full = `${core}${SITE_SUFFIX}`;
  return full.length <= MAX_TITLE_LENGTH ? full : core;
}

export function chapterTitle(
  stats: ChapterVariantStats,
  bookName: string,
): string {
  const core = stats.variantCount === 0
    ? `${bookName} ${stats.chapter} — No Textual Variants`
    : `${bookName} ${stats.chapter} — ${
      formatCount(stats.variantCount)
    } Textual ${plural(stats.variantCount, "Variant", "Variants")}`;
  const full = `${core}${SITE_SUFFIX}`;
  return full.length <= MAX_TITLE_LENGTH ? full : core;
}

export function chapterDescription(
  stats: ChapterVariantStats,
  bookName: string,
): string {
  const body = stats.variantCount === 0
    ? `${bookName} ${stats.chapter} has no textual variants between the ${V1_NAME} and the ${V2_NAME} across its ${
      verseLabel(stats.totalVerseCount)
    }.`
    : `${bookName} ${stats.chapter} has ${
      formatCount(stats.variantCount)
    } textual ${plural(stats.variantCount, "variant", "variants")} across its ${
      verseLabel(stats.totalVerseCount)
    } between the ${V1_NAME} and the ${V2_NAME}.`;
  const qualified = `${body.slice(0, -1)}, including spelling and punctuation.`;
  return qualified.length <= MAX_DESCRIPTION_LENGTH ? qualified : body;
}

export function chapterSummarySentence(stats: ChapterVariantStats): string {
  if (stats.variantCount === 0) {
    return `No textual variants between the ${V1_NAME} and the ${V2_NAME} in this chapter.`;
  }
  const variants = `${formatCount(stats.variantCount)} ${
    plural(stats.variantCount, "textual variant", "textual variants")
  }`;
  return `${variants} across ${
    verseLabel(stats.totalVerseCount)
  } between the ${V1_NAME} and the ${V2_NAME}, including spelling, capitalization, and punctuation.`;
}

export function bookDescription(
  bookName: string,
  chapters: ChapterVariantStats[],
): string {
  const totalVariants = chapters.reduce((n, c) => n + c.variantCount, 0);
  const chapterLabel = `${formatCount(chapters.length)} ${
    plural(chapters.length, "chapter", "chapters")
  }`;

  if (totalVariants === 0) {
    const body =
      `${bookName} has no textual variants between the ${V1_NAME} and the ${V2_NAME} across its ${chapterLabel}.`;
    if (body.length <= MAX_DESCRIPTION_LENGTH) return body;
    return `${bookName} has no textual variants across its ${chapterLabel}.`;
  }

  const full = `${bookName} has ${formatCount(totalVariants)} textual ${
    plural(totalVariants, "variant", "variants")
  } across ${chapterLabel}, compared verse by verse between the ${V1_NAME} and the ${V2_NAME}.`;
  if (full.length <= MAX_DESCRIPTION_LENGTH) return full;

  return `${bookName} has ${formatCount(totalVariants)} textual ${
    plural(totalVariants, "variant", "variants")
  } across ${chapterLabel}.`;
}

export function bookIntroSentences(
  bookName: string,
  chapters: ChapterVariantStats[],
): string[] {
  const totalVariants = chapters.reduce((n, c) => n + c.variantCount, 0);
  const totalVerses = chapters.reduce((n, c) => n + c.totalVerseCount, 0);
  const chapterLabel = `${formatCount(chapters.length)} ${
    plural(chapters.length, "chapter", "chapters")
  }`;

  if (totalVariants === 0) {
    return [
      `${bookName} carries no textual variants across ${chapterLabel} when the ${V1_NAME} is set against the ${V2_NAME}.`,
      `All ${
        formatCount(totalVerses)
      } of its verses read identically in both witnesses.`,
    ];
  }

  const firstSentence = `${bookName} carries ${
    formatCount(totalVariants)
  } textual ${
    plural(totalVariants, "variant", "variants")
  } across ${chapterLabel} when the ${V1_NAME} is set against the ${V2_NAME}, including spelling, capitalization, and punctuation.`;

  if (chapters.length === 1) {
    const perVerseAverage = Math.round(totalVariants / totalVerses);
    return [
      firstSentence,
      `Its ${formatCount(totalVerses)} verses carry an average of ${
        formatCount(perVerseAverage)
      } variants each.`,
    ];
  }

  const busiest = chapters.reduce((a, b) =>
    b.variantCount > a.variantCount ? b : a
  );
  const average = Math.round(totalVariants / chapters.length);

  return [
    firstSentence,
    `Chapter ${busiest.chapter} varies most, with ${
      formatCount(busiest.variantCount)
    }; across the book that is an average of ${
      formatCount(average)
    } variants per chapter.`,
  ];
}
