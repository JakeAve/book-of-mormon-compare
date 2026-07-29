import type { BookAbbr } from "./data.ts";

export const CHAPTER_COUNTS: Record<BookAbbr, number> = {
  "witnesses": 1,
  "title-page": 1,
  "1-ne": 22,
  "2-ne": 33,
  "jacob": 7,
  "enos": 1,
  "jarom": 1,
  "omni": 1,
  "w-of-m": 1,
  "mosiah": 29,
  "alma": 63,
  "hel": 16,
  "3-ne": 30,
  "4-ne": 1,
  "morm": 9,
  "ether": 15,
  "moro": 10,
};

export const CHAPTERLESS_BOOKS: ReadonlySet<string> = new Set([
  "witnesses",
  "title-page",
]);

export function buildChapterHref(
  book: string,
  chapter: string,
  v1: string,
  v2: string,
): string {
  const params = new URLSearchParams({ v1, v2 });
  return `/${book}/${chapter}?${params.toString()}`;
}
