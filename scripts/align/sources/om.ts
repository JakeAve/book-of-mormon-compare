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
      const baseMeta = {
        page: e.chapter,
        line: e.verse,
        markdown: e.markdown,
        source: e.source,
      };
      // Split on every "——" (chapter break marker). Each part except the last
      // has an explicit chapter boundary after it — keep the "——" in the text
      // so it remains visible in the output as an original manuscript marker,
      // and mark those fragments with chapterBreakAtEnd so the aligner clamps
      // them to their anchored verse and doesn't drift forward into the next chapter.
      const parts = e.text.split("——");
      for (let pi = 0; pi < parts.length; pi++) {
        const isLast = pi === parts.length - 1;
        // Re-attach the marker to the end of each non-final part.
        const text = (isLast ? parts[pi] : parts[pi] + "——").trim();
        if (!text || text === "——") continue;
        const chapterBreakAtEnd = !isLast;
        fragments.push({
          id: pi === 0
            ? `${e.chapter}:${e.verse}`
            : `${e.chapter}:${e.verse}|p${pi}`,
          text,
          meta: chapterBreakAtEnd
            ? { ...baseMeta, chapterBreakAtEnd: true }
            : baseMeta,
        });
      }
    }
  }
  return fragments;
}
