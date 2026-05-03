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
