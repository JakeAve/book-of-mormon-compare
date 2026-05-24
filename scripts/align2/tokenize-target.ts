import type { TargetWord } from "./types.ts";

interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  source?: string;
}

export interface VerseGroup {
  book: string;
  chapter: number;
  verse: number;
  words: TargetWord[];
}

function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function tokenizeTarget(verses: Verse[]): TargetWord[] {
  const out: TargetWord[] = [];
  for (const v of verses) {
    const rawWords = v.text.split(/\s+/).filter((w) => w.length > 0);
    for (const rw of rawWords) {
      const norm = normalizeWord(rw);
      if (!norm) continue;
      out.push({ norm, book: v.book, chapter: v.chapter, verse: v.verse });
    }
  }
  return out;
}

export function groupByVerse(words: TargetWord[]): VerseGroup[] {
  const groups: VerseGroup[] = [];
  let current: VerseGroup | null = null;
  for (const w of words) {
    const key = `${w.book}|${w.chapter}|${w.verse}`;
    if (
      !current ||
      `${current.book}|${current.chapter}|${current.verse}` !== key
    ) {
      current = { book: w.book, chapter: w.chapter, verse: w.verse, words: [] };
      groups.push(current);
    }
    current.words.push(w);
  }
  return groups;
}
