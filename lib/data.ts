export const BOOK_ORDER = [
  "witnesses",
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
] as const;

export type BookAbbr = typeof BOOK_ORDER[number];

export const BOOK_DISPLAY_NAMES: Record<BookAbbr, string> = {
  "title-page": "Title Page",
  "witnesses": "Witnesses",
  "1-ne": "1 Nephi",
  "2-ne": "2 Nephi",
  "jacob": "Jacob",
  "enos": "Enos",
  "jarom": "Jarom",
  "omni": "Omni",
  "w-of-m": "Words of Mormon",
  "mosiah": "Mosiah",
  "alma": "Alma",
  "hel": "Helaman",
  "3-ne": "3 Nephi",
  "4-ne": "4 Nephi",
  "morm": "Mormon",
  "ether": "Ether",
  "moro": "Moroni",
};

export const BOOK_CHIP_LABELS: Partial<Record<BookAbbr, string>> = {
  "witnesses": "W",
  "title-page": "TP",
};

export function isBookAbbr(value: string): value is BookAbbr {
  return value in BOOK_DISPLAY_NAMES;
}

export function getBookDisplayName(book: string): string {
  return isBookAbbr(book) ? BOOK_DISPLAY_NAMES[book] : book;
}

export const VERSION_DISPLAY_NAMES: Record<string, string> = {
  "stub": "Stub A",
  "stub2": "Stub B",
  "2013": "2013 Church of Jesus Christ of Latter-day Saints",
  "om": "Original Manuscript",
  "pm": "Printer's Manuscript",
};

export function getVersionDisplayName(version: string): string {
  return VERSION_DISPLAY_NAMES[version] ?? version;
}

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
  const bookIdx = (BOOK_ORDER as readonly string[]).indexOf(book);
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
  /** Present on aligned sources where one canonical verse is stitched from
   * multiple source-text line fragments. Preserved for line-level UI affordances
   * (per-line source links, expandable provenance, etc.). */
  lines?: VerseLine[];
}

export interface VerseLine {
  /** Stable id from the aligner, e.g. "1:1" = page:line on the JS Papers scan. */
  id: string;
  page: number;
  line: number;
  text: string;
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
  try {
    const text = await Deno.readTextFile(path);
    const raw = JSON.parse(text) as Array<Verse | AlignedVerse>;
    return raw.map(normalizeVerse);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return [];
    throw err;
  }
}

interface AlignedVerse {
  book?: string;
  chapter: number;
  verse: number;
  lines: VerseLine[];
}

function normalizeVerse(v: Verse | AlignedVerse): Verse {
  if ("lines" in v && v.lines) {
    return {
      chapter: v.chapter,
      verse: v.verse,
      text: stitchLines(v.lines),
      // For aligned sources we link to the first contributing manuscript page;
      // the full per-line provenance lives on `lines`.
      source: v.lines[0]?.source,
      lines: v.lines,
    };
  }
  return v as Verse;
}

/** Join scribal line fragments into a single verse text. The OM transcript
 * doesn't mark which line-ends are mid-word breaks (e.g. "...it ca / me to
 * pass...") versus normal end-of-word breaks ("...wherefore he / did as the
 * Lord..."), so we always insert a space. This leaves visible artifacts on
 * mid-word breaks ("wildern ess") but keeps every other word boundary correct
 * — and the diff tokenizer still finds anchor matches on the surrounding
 * words. A future pass with a dictionary or bigram check could split the
 * cases. */
function stitchLines(lines: VerseLine[]): string {
  return lines
    .map((l) => l.text.trim())
    .filter((t) => t.length > 0)
    .join(" ");
}
