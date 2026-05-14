// Align a source-text transcript onto the canonical 2013 versification and
// write the per-chapter output tree.
//
// Usage (via deno task):
//   deno task align:om
//   deno task align:pm
//
// Or directly:
//   deno run -A scripts/align-source.ts <slug> [--preview N] [--dry]
//
// Where <slug> is registered in scripts/align/paths.ts. The pipeline is:
//   1. Load raw transcript pages from <slug>-raw/json/
//   2. Load canonical 2013 verses
//   3. align() → per-source-line AlignedFragment with verse segments
//   4. Slice each line's text by segment, bucket per canonical verse
//   5. Write data/bom/<slug>/<book>/<chapter>.json

import { align } from "./align/align.ts";
import { loadOM } from "./align/sources/om.ts";
import { BOOK_ORDER, loadBooks } from "./align/sources/bom2013.ts";
import {
  isSourceSlug,
  type SourceConfig,
  SOURCES,
  TARGET_ROOT,
} from "./align/paths.ts";

interface OutLine {
  id: string;
  page: number;
  line: number;
  text: string;
  markdown?: string;
  source?: string;
}

interface OutVerse {
  book: string;
  chapter: number;
  verse: number;
  lines: OutLine[];
}

interface Args {
  slug: string;
  preview: number;
  dry: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { slug: "", preview: 0, dry: false };
  let positional = 0;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--preview") args.preview = parseInt(argv[++i]);
    else if (a === "--dry") args.dry = true;
    else if (!a.startsWith("--") && positional++ === 0) args.slug = a;
  }
  return args;
}

async function run(cfg: SourceConfig, opts: { preview: number; dry: boolean }) {
  console.log(`Aligning ${cfg.label} (${cfg.raw} → ${cfg.out})`);
  const fragments = await loadOM(cfg.raw);
  const verses = await loadBooks(TARGET_ROOT);
  console.log(
    `  source lines: ${fragments.length}, target verses: ${verses.length}`,
  );

  const { aligned, stats } = align(fragments, verses);
  console.log(
    `  aligned ${aligned.length}, anchors=${stats.anchors}, src=${stats.sourceTokens}, tgt=${stats.targetTokens}`,
  );

  // Build verse buckets from segments. Slice each line's raw text by segment.
  const fragById = new Map(fragments.map((f) => [f.id, f]));
  const verseKey = (b: string, c: number, v: number) => `${b}|${c}|${v}`;
  const byKey = new Map<string, OutVerse>();

  for (const a of aligned) {
    const frag = fragById.get(a.id)!;
    const meta = frag.meta ?? {};
    const words = frag.text.split(/\s+/).filter((w) => w.length > 0);
    const mdRaw = meta.markdown as string | undefined;
    const mdWords = mdRaw?.split(/\s+/).filter((w) => w.length > 0);
    for (const seg of a.segments) {
      const slice = words.slice(seg.tokenStart, seg.tokenEnd).join(" ");
      if (!slice) continue;
      const mdSlice = mdWords?.slice(seg.tokenStart, seg.tokenEnd).join(" ");
      const k = verseKey(seg.verse.book, seg.verse.chapter, seg.verse.verse);
      let v = byKey.get(k);
      if (!v) {
        v = {
          book: seg.verse.book,
          chapter: seg.verse.chapter,
          verse: seg.verse.verse,
          lines: [],
        };
        byKey.set(k, v);
      }
      v.lines.push({
        id: `${meta.page}:${meta.line}`,
        page: meta.page as number,
        line: meta.line as number,
        text: slice,
        ...(mdSlice && mdSlice !== slice ? { markdown: mdSlice } : {}),
        source: meta.source as string | undefined,
      });
    }
  }

  // Group into per-chapter files, preserving canonical verse order.
  const byFile = new Map<string, OutVerse[]>();
  for (const v of verses) {
    const k = verseKey(v.book, v.chapter, v.verse);
    const entry = byKey.get(k);
    if (!entry) continue;
    const fk = `${v.book}/${v.chapter}`;
    let arr = byFile.get(fk);
    if (!arr) byFile.set(fk, arr = []);
    arr.push(entry);
  }

  if (opts.preview > 0) {
    const flat = aligned.slice(0, opts.preview);
    console.log("\n  preview:");
    for (const a of flat) {
      const range =
        a.start.book === a.end.book && a.start.chapter === a.end.chapter
          ? `${a.start.book} ${a.start.chapter}:${a.start.verse}${
            a.end.verse !== a.start.verse ? `-${a.end.verse}` : ""
          }`
          : `${a.start.book} ${a.start.chapter}:${a.start.verse} → ${a.end.book} ${a.end.chapter}:${a.end.verse}`;
      console.log(
        `    ${a.id.padEnd(8)} ${
          range.padEnd(22)
        } (${a.matchedTokens}/${a.totalTokens})`,
      );
    }
  }

  if (opts.dry) {
    console.log("\n  --dry: skipping write");
  } else {
    try {
      await Deno.remove(cfg.out, { recursive: true });
    } catch (_) { /* ok if missing */ }
    for (const slug of BOOK_ORDER) {
      await Deno.mkdir(`${cfg.out}/${slug}`, { recursive: true });
    }
    let filesWritten = 0;
    let versesWritten = 0;
    for (const [fk, arr] of byFile) {
      const [book, chapter] = fk.split("/");
      await Deno.writeTextFile(
        `${cfg.out}/${book}/${chapter}.json`,
        JSON.stringify(arr, null, 2) + "\n",
      );
      filesWritten++;
      versesWritten += arr.length;
    }
    console.log(
      `\n  wrote ${filesWritten} files, ${versesWritten} verses → ${cfg.out}/`,
    );
  }

  // Coverage report.
  const coveredByBook = new Map<string, number>();
  for (const v of byKey.values()) {
    coveredByBook.set(v.book, (coveredByBook.get(v.book) ?? 0) + 1);
  }
  const totalByBook = new Map<string, number>();
  for (const v of verses) {
    totalByBook.set(v.book, (totalByBook.get(v.book) ?? 0) + 1);
  }
  console.log("\n  coverage by book:");
  for (const slug of BOOK_ORDER) {
    const covered = coveredByBook.get(slug) ?? 0;
    const total = totalByBook.get(slug) ?? 0;
    const pct = total ? ((covered / total) * 100).toFixed(0) : "0";
    console.log(
      `    ${slug.padEnd(8)} ${String(covered).padStart(4)} / ${
        String(total).padStart(4)
      }  (${pct}%)`,
    );
  }
}

if (import.meta.main) {
  const args = parseArgs(Deno.args);
  if (!args.slug) {
    console.error("usage: align-source.ts <slug> [--preview N] [--dry]");
    console.error(`available slugs: ${Object.keys(SOURCES).join(", ")}`);
    Deno.exit(1);
  }
  if (!isSourceSlug(args.slug)) {
    console.error(`unknown source slug: ${args.slug}`);
    console.error(`available: ${Object.keys(SOURCES).join(", ")}`);
    Deno.exit(1);
  }
  await run(SOURCES[args.slug], { preview: args.preview, dry: args.dry });
}
