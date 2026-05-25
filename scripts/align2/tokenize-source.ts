import { lineKey } from "./line-key.ts";
import type { LineInfo, SourceWord } from "./types.ts";

interface PMEntry {
  text: string;
  markdown?: string;
  chapter: number;
  verse: number;
  source?: string;
}

export interface TokenizeSourceResult {
  words: SourceWord[];
  lines: Map<string, LineInfo>;
}

function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/~~[^~]*~~/g, "")
    .replace(/\{\{|\}\}/g, "")
    .replace(/\[|\]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export async function tokenizeSource(
  root: string,
): Promise<TokenizeSourceResult> {
  const files: number[] = [];
  for await (const entry of Deno.readDir(root)) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      files.push(parseInt(entry.name));
    }
  }
  files.sort((a, b) => a - b);

  const words: SourceWord[] = [];
  const lines = new Map<string, LineInfo>();

  for (const pageNum of files) {
    const raw = await Deno.readTextFile(`${root}/${pageNum}.json`);
    const entries = JSON.parse(raw) as PMEntry[];
    for (const e of entries) {
      const page = e.chapter;
      const line = e.verse;
      const key = lineKey(page, line);
      if (!lines.has(key)) {
        lines.set(key, {
          page,
          line,
          text: e.text,
          ...(e.markdown && e.markdown !== e.text
            ? { markdown: e.markdown }
            : {}),
          source: e.source,
        });
      }
      const rawWords = e.text.split(/\s+/).filter((w) => w.length > 0);
      for (let i = 0; i < rawWords.length; i++) {
        const norm = normalizeWord(rawWords[i]);
        if (!norm) continue;
        words.push({
          norm,
          raw: rawWords[i],
          page,
          line,
          wordIndexInLine: i,
          source: e.source,
        });
      }
    }
  }
  return { words, lines };
}
