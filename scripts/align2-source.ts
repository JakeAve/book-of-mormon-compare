import { tokenizeSource } from "./align2/tokenize-source.ts";
import { groupByVerse, tokenizeTarget } from "./align2/tokenize-target.ts";
import { runCursor } from "./align2/cursor.ts";
import { buildAllVerseOutputs } from "./align2/segment.ts";
import { BOOK_ORDER, loadBooks } from "./align/sources/bom2013.ts";
import { TARGET_ROOT } from "./align/paths.ts";

const PM_RAW = "data/raw/pm";
const PM2_OUT = "data/bom/pm2";

async function run(opts: { dry: boolean; preview: number }) {
  console.log("aligner2: PM alignment starting");

  const [{ words: sourceWords, lines: lineInfos }, canonVerses] = await Promise
    .all([
      tokenizeSource(PM_RAW),
      loadBooks(TARGET_ROOT),
    ]);
  console.log(`  source words: ${sourceWords.length}`);
  console.log(`  target verses: ${canonVerses.length}`);

  const targetWords = tokenizeTarget(canonVerses);
  const verseGroups = groupByVerse(targetWords);

  const cursorResults = runCursor(sourceWords, verseGroups);
  console.log(`  cursor assigned: ${cursorResults.length} words`);

  const canonByKey = new Map(
    canonVerses.map((v) => [`${v.book}|${v.chapter}|${v.verse}`, v.text]),
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
    await Deno.remove(PM2_OUT, { recursive: true });
  } catch (_) { /* ok if missing */ }

  for (const slug of BOOK_ORDER) {
    await Deno.mkdir(`${PM2_OUT}/${slug}`, { recursive: true });
  }

  // Write per-chapter files in canonical verse order
  const byFile = new Map<string, typeof outVerses>();
  // Iterate canonVerses to guarantee canonical order in output files
  for (const cv of canonVerses) {
    const vk = `${cv.book}|${cv.chapter}|${cv.verse}`;
    const outVerse = outVerses.find(
      (v) => `${v.book}|${v.chapter}|${v.verse}` === vk,
    );
    if (!outVerse) continue;
    const fk = `${cv.book}/${cv.chapter}`;
    if (!byFile.has(fk)) byFile.set(fk, []);
    byFile.get(fk)!.push(outVerse);
  }

  let filesWritten = 0;
  for (const [fk, arr] of byFile) {
    await Deno.writeTextFile(
      `${PM2_OUT}/${fk}.json`,
      JSON.stringify(arr, null, 2) + "\n",
    );
    filesWritten++;
  }
  console.log(`\n  wrote ${filesWritten} files → ${PM2_OUT}/`);
}

if (import.meta.main) {
  const dry = Deno.args.includes("--dry");
  const pi = Deno.args.indexOf("--preview");
  const preview = pi >= 0 ? parseInt(Deno.args[pi + 1]) : 0;
  await run({ dry, preview });
}
