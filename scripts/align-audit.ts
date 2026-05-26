// Token-purity audit for an aligned source. Reports the fraction of source
// tokens whose emitted verse-assignment matches a canonical word in that
// verse — a much finer-grained signal than `versesWithFindings`.
//
// Usage:
//   deno run -A scripts/align-audit.ts <version> [<version2> ...]
//
// Examples:
//   deno run -A scripts/align-audit.ts om
//   deno run -A scripts/align-audit.ts pm om            # compare both
//   deno run -A scripts/align-audit.ts pm 1830 1837 om

interface ChapterReport {
  book: string;
  chapter: number;
  verses: Array<{
    verse: number;
    totalTokens: number;
    matchedToExpected: number;
  }>;
}

interface Summary {
  version: string;
  chapters: number;
  verses: number;
  totalTokens: number;
  matchedTokens: number;
  purity: number;
  // Distribution of per-verse purity, bucketed
  buckets: { [range: string]: number };
}

async function readReport(version: string): Promise<ChapterReport[]> {
  const root = `data/reports/${version}`;
  const out: ChapterReport[] = [];
  for await (const bookEntry of Deno.readDir(root)) {
    if (!bookEntry.isDirectory) continue;
    const bookDir = `${root}/${bookEntry.name}`;
    for await (const chEntry of Deno.readDir(bookDir)) {
      if (!chEntry.isFile || !chEntry.name.endsWith(".json")) continue;
      const raw = await Deno.readTextFile(`${bookDir}/${chEntry.name}`);
      out.push(JSON.parse(raw) as ChapterReport);
    }
  }
  return out;
}

function summarize(version: string, chapters: ChapterReport[]): Summary {
  let totalTokens = 0;
  let matchedTokens = 0;
  let verseCount = 0;
  const buckets: Record<string, number> = {
    "0%": 0,
    "0-25%": 0,
    "25-50%": 0,
    "50-75%": 0,
    "75-99%": 0,
    "100%": 0,
  };
  for (const ch of chapters) {
    for (const v of ch.verses) {
      verseCount++;
      totalTokens += v.totalTokens;
      matchedTokens += v.matchedToExpected;
      if (v.totalTokens === 0) continue;
      const p = v.matchedToExpected / v.totalTokens;
      if (p === 0) buckets["0%"]++;
      else if (p < 0.25) buckets["0-25%"]++;
      else if (p < 0.5) buckets["25-50%"]++;
      else if (p < 0.75) buckets["50-75%"]++;
      else if (p < 1) buckets["75-99%"]++;
      else buckets["100%"]++;
    }
  }
  return {
    version,
    chapters: chapters.length,
    verses: verseCount,
    totalTokens,
    matchedTokens,
    purity: totalTokens > 0 ? matchedTokens / totalTokens : 0,
    buckets,
  };
}

function printSummary(s: Summary) {
  console.log(`\n== ${s.version} ==`);
  console.log(`  chapters:  ${s.chapters}`);
  console.log(`  verses:    ${s.verses}`);
  console.log(
    `  tokens:    ${s.matchedTokens} matched / ${s.totalTokens} total`,
  );
  console.log(`  purity:    ${(s.purity * 100).toFixed(1)}%`);
  console.log(`  verse-level purity distribution:`);
  for (const [range, n] of Object.entries(s.buckets)) {
    const pct = s.verses > 0 ? ((n / s.verses) * 100).toFixed(1) : "0";
    console.log(`    ${range.padEnd(10)} ${String(n).padStart(5)}  (${pct}%)`);
  }
}

if (import.meta.main) {
  const versions = Deno.args.length > 0
    ? Deno.args
    : ["pm", "1830", "1837", "om"];
  const summaries: Summary[] = [];
  for (const v of versions) {
    try {
      const ch = await readReport(v);
      summaries.push(summarize(v, ch));
    } catch (err) {
      console.error(
        `skipping ${v}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  for (const s of summaries) printSummary(s);

  // Compact comparison table at the end.
  if (summaries.length > 1) {
    console.log(`\n== Summary ==`);
    console.log(
      `${"version".padEnd(10)} ${"chapters".padStart(10)} ${
        "verses".padStart(8)
      } ${"tokens".padStart(10)} ${"purity".padStart(10)}`,
    );
    for (const s of summaries) {
      console.log(
        `${s.version.padEnd(10)} ${String(s.chapters).padStart(10)} ${
          String(s.verses).padStart(8)
        } ${String(s.totalTokens).padStart(10)} ${
          (s.purity * 100).toFixed(1).padStart(9)
        }%`,
      );
    }
  }
}
