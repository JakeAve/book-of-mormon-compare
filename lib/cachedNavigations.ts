import { BOOK_ORDER } from "./data.ts";

export type CachedEntry = {
  book: string;
  chapter: number;
  v1: string;
  v2: string;
  href: string;
};

export type CachedGroup = {
  v1: string;
  v2: string;
  entries: CachedEntry[];
};

const BOOK_SET = new Set<string>(BOOK_ORDER as readonly string[]);

function parse(href: string): CachedEntry | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const match = url.pathname.match(/^\/([^/]+)\/(\d+)\/?$/);
  if (!match) return null;
  const [, book, chapterStr] = match;
  if (!BOOK_SET.has(book)) return null;
  const chapter = Number(chapterStr);
  if (!Number.isInteger(chapter)) return null;
  const v1 = url.searchParams.get("v1");
  const v2 = url.searchParams.get("v2");
  if (!v1 || !v2) return null;
  return {
    book,
    chapter,
    v1,
    v2,
    href: `${url.pathname}${url.search}`,
  };
}

export function groupCachedNavigations(hrefs: string[]): CachedGroup[] {
  const bookIndex = new Map<string, number>();
  (BOOK_ORDER as readonly string[]).forEach((b, i) => bookIndex.set(b, i));

  const byPair = new Map<string, CachedGroup>();
  for (const href of hrefs) {
    const entry = parse(href);
    if (!entry) continue;
    const key = `${entry.v1}↔${entry.v2}`;
    let group = byPair.get(key);
    if (!group) {
      group = { v1: entry.v1, v2: entry.v2, entries: [] };
      byPair.set(key, group);
    }
    group.entries.push(entry);
  }

  for (const group of byPair.values()) {
    group.entries.sort((a, b) => {
      const ai = bookIndex.get(a.book) ?? Number.MAX_SAFE_INTEGER;
      const bi = bookIndex.get(b.book) ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a.chapter - b.chapter;
    });
  }

  return [...byPair.values()];
}
