import { tokenizeSource } from "./align2/tokenize-source.ts";
import { groupByVerse, tokenizeTarget } from "./align2/tokenize-target.ts";
import { runCursor } from "./align2/cursor.ts";
import { runScaffoldAlign } from "./align2/scaffold-align.ts";
import { buildAllVerseOutputs, type OutVerse } from "./align2/build-output.ts";
import { verseKey } from "./align2/line-key.ts";
import {
  ADAPTERS,
  getAdapter,
  type SourceAdapter,
} from "./align2/sources/index.ts";
import { BOOK_ORDER, loadBooks } from "./shared/bom2013.ts";
import { TARGET_ROOT } from "./shared/paths.ts";

async function run(
  adapter: SourceAdapter,
  opts: { dry: boolean; preview: number },
) {
  console.log(`aligner2: ${adapter.label} alignment starting`);

  const [{ words: sourceWords, lines: lineInfos }, canonVerses] = await Promise
    .all([
      tokenizeSource(adapter.raw),
      loadBooks(TARGET_ROOT),
    ]);
  console.log(`  source words: ${sourceWords.length}`);
  console.log(`  target verses: ${canonVerses.length}`);

  const targetWords = tokenizeTarget(canonVerses);
  const verseGroups = groupByVerse(targetWords);

  const cursorResults = adapter.algorithm === "scaffold"
    ? runScaffoldAlign(sourceWords, verseGroups, lineInfos, {
      ngrams: [6, 4, 3],
      minTokensPerVerse: adapter.scaffoldMinTokensPerVerse ?? 3,
    })
    : runCursor(
      sourceWords,
      verseGroups,
      lineInfos,
      adapter.cursor,
      adapter.dictionary,
    );
  console.log(`  cursor assigned: ${cursorResults.length} words`);

  const canonByKey = new Map(
    canonVerses.map((v) => [verseKey(v.book, v.chapter, v.verse), v.text]),
  );

  const outVerses = buildAllVerseOutputs(cursorResults, lineInfos, canonByKey);
  console.log(`  output verses: ${outVerses.length}`);

  if (opts.preview > 0) {
    console.log("\n  preview (first verses):");
    for (const v of outVerses.slice(0, opts.preview)) {
      console.log(
        `    ${v.book} ${v.chapter}:${v.verse} — ${v.lines.length} line(s)`,
      );
    }
  }

  if (opts.dry) {
    console.log("\n  --dry: skipping write");
    return;
  }

  try {
    await Deno.remove(adapter.out, { recursive: true });
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }

  for (const slug of BOOK_ORDER) {
    await Deno.mkdir(`${adapter.out}/${slug}`, { recursive: true });
  }

  const outByKey = new Map<string, OutVerse>();
  for (const v of outVerses) {
    outByKey.set(verseKey(v.book, v.chapter, v.verse), v);
  }
  const byFile = new Map<string, OutVerse[]>();
  for (const cv of canonVerses) {
    const outVerse = outByKey.get(verseKey(cv.book, cv.chapter, cv.verse));
    if (!outVerse) continue;
    const fk = `${cv.book}/${cv.chapter}`;
    let bucket = byFile.get(fk);
    if (!bucket) {
      bucket = [];
      byFile.set(fk, bucket);
    }
    bucket.push(outVerse);
  }

  let filesWritten = 0;
  for (const [fk, arr] of byFile) {
    await Deno.writeTextFile(
      `${adapter.out}/${fk}.json`,
      JSON.stringify(arr, null, 2) + "\n",
    );
    filesWritten++;
  }
  console.log(`\n  wrote ${filesWritten} files → ${adapter.out}/`);
}

if (import.meta.main) {
  const positional = Deno.args.filter((a) => !a.startsWith("--"));
  const slug = positional[0] ?? "pm";
  const adapter = getAdapter(slug);
  if (!adapter) {
    console.error(
      `unknown source slug: ${slug}. Known: ${
        Object.keys(ADAPTERS).join(", ")
      }`,
    );
    Deno.exit(1);
  }
  const dry = Deno.args.includes("--dry");
  const pi = Deno.args.indexOf("--preview");
  const preview = pi >= 0 ? parseInt(Deno.args[pi + 1]) : 0;
  await run(adapter, { dry, preview });
}
