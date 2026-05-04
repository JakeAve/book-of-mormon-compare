export const BOOK_ORDER: string[] = [
  "1-nephi",
  "2-nephi",
  "jacob",
  "enos",
  "jarom",
  "omni",
  "words-of-mormon",
  "mosiah",
  "alma",
  "helaman",
  "3-nephi",
  "4-nephi",
  "mormon",
  "ether",
  "moroni",
];

export const BOOK_DISPLAY_NAMES: Record<string, string> = {
  "1-nephi": "1 Nephi",
  "2-nephi": "2 Nephi",
  "jacob": "Jacob",
  "enos": "Enos",
  "jarom": "Jarom",
  "omni": "Omni",
  "words-of-mormon": "Words of Mormon",
  "mosiah": "Mosiah",
  "alma": "Alma",
  "helaman": "Helaman",
  "3-nephi": "3 Nephi",
  "4-nephi": "4 Nephi",
  "mormon": "Mormon",
  "ether": "Ether",
  "moroni": "Moroni",
};

async function listChapters(
  version: string,
  book: string,
  bomDir: string,
): Promise<string[]> {
  try {
    const dir = `${bomDir}/${version}/${book}`;
    const nums: number[] = [];
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const n = parseInt(entry.name.slice(0, -5), 10);
        if (!isNaN(n)) nums.push(n);
      }
    }
    return nums.sort((a, b) => a - b).map(String);
  } catch {
    return [];
  }
}

export async function getAdjacentChapters(
  version: string,
  book: string,
  chapter: string,
  bomDir = "data/bom",
): Promise<{
  prev: { book: string; chapter: string } | null;
  next: { book: string; chapter: string } | null;
}> {
  const bookIdx = BOOK_ORDER.indexOf(book);
  const chapters = await listChapters(version, book, bomDir);
  const chIdx = chapters.indexOf(chapter);

  let prev: { book: string; chapter: string } | null = null;
  let next: { book: string; chapter: string } | null = null;

  if (chIdx > 0) {
    prev = { book, chapter: chapters[chIdx - 1] };
  } else if (bookIdx > 0) {
    const prevBook = BOOK_ORDER[bookIdx - 1];
    const prevChapters = await listChapters(version, prevBook, bomDir);
    if (prevChapters.length > 0) {
      prev = { book: prevBook, chapter: prevChapters[prevChapters.length - 1] };
    }
  }

  if (chIdx >= 0 && chIdx < chapters.length - 1) {
    next = { book, chapter: chapters[chIdx + 1] };
  } else if (chIdx === chapters.length - 1 && bookIdx < BOOK_ORDER.length - 1) {
    const nextBook = BOOK_ORDER[bookIdx + 1];
    const nextChapters = await listChapters(version, nextBook, bomDir);
    if (nextChapters.length > 0) {
      next = { book: nextBook, chapter: nextChapters[0] };
    }
  }

  return { prev, next };
}

export interface Verse {
  chapter: number;
  verse: number;
  text: string;
  markdown?: string;
  source?: string;
}

export const STUB_VERSES: Verse[] = [
  {
    chapter: 1,
    verse: 1,
    text: "I Nephi having been born of goodly parents therefore I was taught somewhat in all the learning of my father",
    markdown: "I Nephi having been born of goodly parents therefore I was taught somewhat in all the learning of my father",
  },
  {
    chapter: 1,
    verse: 2,
    text: "And it came to pass that he departed into the wilderness and left his house and the land of his inheritance",
    markdown: "And it came to pass that he departed into the wilderness and left his house and the land of his inheritance",
  },
  {
    chapter: 1,
    verse: 3,
    text: "And it came to pass that he traveled three days in the wilderness",
    markdown: "And it came to pass that he traveled three days in the wilderness",
  },
];

export async function getVersions(bomDir = "data/bom"): Promise<string[]> {
  try {
    const entries: string[] = [];
    for await (const entry of Deno.readDir(bomDir)) {
      if (entry.isDirectory) entries.push(entry.name);
    }
    return entries.sort();
  } catch {
    return ["stub"];
  }
}

export async function loadChapter(
  version: string,
  book: string,
  chapter: string,
): Promise<Verse[]> {
  const path = `data/bom/${version}/${book}/${chapter}.json`;
  if (version === "stub") {
    try {
      const text = await Deno.readTextFile(path);
      return JSON.parse(text) as Verse[];
    } catch {
      return STUB_VERSES;
    }
  }
  const text = await Deno.readTextFile(path);
  return JSON.parse(text) as Verse[];
}
