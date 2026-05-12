// Loader for the Original Manuscript transcript under data/bom/om/json/.
//
// Each file is one JS Papers manuscript page. The "chapter" field is the page
// number; "verse" is the line on that page. Order = numeric file name.

import type { SourceFragment } from "../types.ts";

interface OMEntry {
  text: string;
  markdown?: string;
  chapter: number; // page number
  verse: number; // line on page
  source?: string;
}

export interface LoadOMOptions {
  /** Optional [startPage, endPage] inclusive filter. */
  pageRange?: [number, number];
}

export async function loadOM(
  root: string,
  opts: LoadOMOptions = {},
): Promise<SourceFragment[]> {
  const files: number[] = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      files.push(parseInt(entry.name));
    }
  }
  files.sort((a, b) => a - b);

  const [lo, hi] = opts.pageRange ?? [-Infinity, Infinity];
  const fragments: SourceFragment[] = [];
  for (const page of files) {
    if (page < lo || page > hi) continue;
    const raw = await Deno.readTextFile(`${root}/${page}.json`);
    const entries = JSON.parse(raw) as OMEntry[];
    for (const e of entries) {
      fragments.push({
        id: `${e.chapter}:${e.verse}`,
        text: e.text,
        meta: {
          page: e.chapter,
          line: e.verse,
          markdown: e.markdown,
          source: e.source,
        },
      });
    }
  }
  return fragments;
}
