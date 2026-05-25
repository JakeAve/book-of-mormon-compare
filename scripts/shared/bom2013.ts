// Loader for the canonical 2013 Book of Mormon edition under data/bom/2013/.
//
// Layout: data/bom/2013/<book-slug>/<chapter>.json
// Each chapter file is an array of `{ book, chapter, verse, text, source }`.

export interface TargetVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

// Canonical book order — the slug names match the directories on disk.
export const BOOK_ORDER = [
  "title-page",
  "1-ne",
  "2-ne",
  "jacob",
  "enos",
  "jarom",
  "omni",
  "w-of-m",
  "mosiah",
  "alma",
  "hel",
  "3-ne",
  "4-ne",
  "morm",
  "ether",
  "moro",
  "witnesses",
] as const;

export type BookSlug = typeof BOOK_ORDER[number];

export async function loadBook(
  root: string,
  slug: BookSlug,
): Promise<TargetVerse[]> {
  const dir = `${root}/${slug}`;
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile && entry.name.endsWith(".json")) files.push(entry.name);
  }
  files.sort((a, b) => parseInt(a) - parseInt(b));
  const verses: TargetVerse[] = [];
  for (const f of files) {
    const raw = await Deno.readTextFile(`${dir}/${f}`);
    const arr = JSON.parse(raw) as TargetVerse[];
    for (const v of arr) verses.push(v);
  }
  return verses;
}

export async function loadBooks(
  root: string,
  slugs: readonly BookSlug[] = BOOK_ORDER,
): Promise<TargetVerse[]> {
  const out: TargetVerse[] = [];
  for (const slug of slugs) {
    const vs = await loadBook(root, slug);
    for (const v of vs) out.push(v);
  }
  return out;
}
