// Usage:
//   deno run -A scripts/align-report.ts <version> [book] [chapter]
//
// Examples:
//   deno run -A scripts/align-report.ts om            # every book/chapter
//   deno run -A scripts/align-report.ts om 1-ne       # all chapters of 1 Nephi
//   deno run -A scripts/align-report.ts om 1-ne 11    # single chapter
//
// Output: data/reports/<version>/<book>/<chapter>.json plus a top-level
// data/reports/<version>/summary.json index.

import { BOOK_ORDER, loadChapter, type Verse } from "../lib/data.ts";
import { buildChapterReport, type ChapterReport } from "./align/report.ts";

const REPORT_ROOT = "data/reports";

async function listChapters(version: string, book: string): Promise<number[]> {
  const dir = `data/bom/${version}/${book}`;
  const nums: number[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const n = parseInt(entry.name.slice(0, -5), 10);
        if (!isNaN(n)) nums.push(n);
      }
    }
  } catch {
    // missing book directory → no chapters
  }
  return nums.sort((a, b) => a - b);
}

async function listBooks(version: string): Promise<string[]> {
  const dir = `data/bom/${version}`;
  const out: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (
        entry.isDirectory &&
        (BOOK_ORDER as readonly string[]).includes(entry.name)
      ) {
        out.push(entry.name);
      }
    }
  } catch {
    // missing version directory
  }
  return out.sort(
    (a, b) =>
      BOOK_ORDER.indexOf(a as typeof BOOK_ORDER[number]) -
      BOOK_ORDER.indexOf(b as typeof BOOK_ORDER[number]),
  );
}

async function loadAdjacent(
  book: string,
  chapter: number,
): Promise<{
  prevCanonical?: Verse[];
  prevChapter?: number;
  nextCanonical?: Verse[];
  nextChapter?: number;
}> {
  const result: Awaited<ReturnType<typeof loadAdjacent>> = {};
  if (chapter > 1) {
    const prev = await loadChapter("2013", book, String(chapter - 1));
    if (prev.length) {
      result.prevCanonical = prev;
      result.prevChapter = chapter - 1;
    }
  }
  const next = await loadChapter("2013", book, String(chapter + 1));
  if (next.length) {
    result.nextCanonical = next;
    result.nextChapter = chapter + 1;
  }
  return result;
}

async function reportChapter(
  version: string,
  book: string,
  chapter: number,
): Promise<ChapterReport | null> {
  const aligned = await loadChapter(version, book, String(chapter));
  const canonical = await loadChapter("2013", book, String(chapter));
  if (aligned.length === 0 || canonical.length === 0) return null;
  const adj = await loadAdjacent(book, chapter);
  return buildChapterReport({
    version,
    book,
    chapter,
    aligned,
    canonical,
    ...adj,
  });
}

async function writeReport(report: ChapterReport): Promise<void> {
  const dir = `${REPORT_ROOT}/${report.version}/${report.book}`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/${report.chapter}.json`,
    JSON.stringify(report, null, 2),
  );
}

interface SummaryEntry {
  book: string;
  chapter: number;
  versesWithFindings: number;
  totalVerses: number;
  findingsByType: ChapterReport["summary"]["findingsByType"];
  internalSplitCount: number;
}

async function main() {
  const [version, book, chapter] = Deno.args;
  if (!version) {
    console.error(
      "Usage: deno run -A scripts/align-report.ts <version> [book] [chapter]",
    );
    Deno.exit(1);
  }

  const books = book ? [book] : await listBooks(version);
  const summary: SummaryEntry[] = [];

  for (const b of books) {
    const chapters = chapter
      ? [Number(chapter)]
      : await listChapters(version, b);
    for (const c of chapters) {
      const report = await reportChapter(version, b, c);
      if (!report) {
        console.warn(`skipped ${version} ${b} ${c} (missing data)`);
        continue;
      }
      await writeReport(report);
      summary.push({
        book: b,
        chapter: c,
        versesWithFindings: report.summary.versesWithFindings,
        totalVerses: report.summary.totalVerses,
        findingsByType: report.summary.findingsByType,
        internalSplitCount: report.summary.internalSplitCount,
      });
      if (report.summary.versesWithFindings > 0) {
        console.log(
          `${b} ${c}: ${report.summary.versesWithFindings}/${report.summary.totalVerses} verses with findings`,
        );
      }
    }
  }

  summary.sort((a, b) =>
    b.versesWithFindings - a.versesWithFindings ||
    a.book.localeCompare(b.book) ||
    a.chapter - b.chapter
  );
  await Deno.mkdir(`${REPORT_ROOT}/${version}`, { recursive: true });
  await Deno.writeTextFile(
    `${REPORT_ROOT}/${version}/summary.json`,
    JSON.stringify(
      {
        version,
        generatedAt: new Date().toISOString(),
        chapters: summary,
      },
      null,
      2,
    ),
  );

  const totalFindings = summary.reduce(
    (acc, s) => acc + s.versesWithFindings,
    0,
  );
  console.log(
    `\nWrote ${summary.length} chapter report(s) to ${REPORT_ROOT}/${version}/. ` +
      `${totalFindings} verses flagged.`,
  );
}

if (import.meta.main) {
  await main();
}
