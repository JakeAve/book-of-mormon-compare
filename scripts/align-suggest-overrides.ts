// Scans aligned manuscript chapters against the 2013 canonical text and
// surfaces likely verse-boundary misalignments as actionable findings.
//
// Usage:
//   deno run -A scripts/align-suggest-overrides.ts <version> [book] [chapter]
//
// Examples:
//   deno run -A scripts/align-suggest-overrides.ts pm
//   deno run -A scripts/align-suggest-overrides.ts pm 1-ne
//   deno run -A scripts/align-suggest-overrides.ts pm 1-ne 1
//
// Output: data/reports/<version>/override-suggestions.json (gitignored)

import {
  BOOK_ORDER,
  loadChapter,
  type Verse,
  type VerseLine,
} from "../lib/data.ts";
import { normalize } from "./align/report.ts";
import { getSiteUrl } from "../lib/config.ts";

// Raw source entry shape (matches data/raw/<version>/<page>.json).
interface RawSourceEntry {
  text: string;
  chapter: number; // = page number
  verse: number; // = line number within page
  source?: string;
}

// Normalize a single raw word exactly as tokenize-source.ts does.
function normalizeSourceWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/~~[^~]*~~/g, "")
    .replace(/\{\{|\}\}/g, "")
    .replace(/\[|\]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Tokenize a single raw-source line text into normalized words with their
// 0-based word indices. Mirrors the per-entry loop in tokenize-source.ts.
function tokenizeRawLine(text: string): { norm: string; index: number }[] {
  const rawWords = text.split(/\s+/).filter((w) => w.length > 0);
  const out: { norm: string; index: number }[] = [];
  for (let i = 0; i < rawWords.length; i++) {
    const norm = normalizeSourceWord(rawWords[i]);
    if (norm) out.push({ norm, index: i });
  }
  return out;
}

// Cache of loaded raw source pages: version → page → entries[].
const rawSourceCache = new Map<string, Map<number, RawSourceEntry[]>>();

async function loadRawPage(
  version: string,
  page: number,
): Promise<RawSourceEntry[]> {
  let versionCache = rawSourceCache.get(version);
  if (!versionCache) {
    versionCache = new Map();
    rawSourceCache.set(version, versionCache);
  }
  if (versionCache.has(page)) return versionCache.get(page)!;
  try {
    const raw = await Deno.readTextFile(`data/raw/${version}/${page}.json`);
    const entries = JSON.parse(raw) as RawSourceEntry[];
    versionCache.set(page, entries);
    return entries;
  } catch {
    versionCache.set(page, []);
    return [];
  }
}

const K = 5; // boundary window: number of words to inspect at each verse edge
const RATIO_LO = 0.4;
const RATIO_HI = 2.5;

// Words that carry no alignment signal on their own. A boundary overlap
// consisting entirely of these is treated as noise.
const STOP_WORDS = new Set([
  "and",
  "the",
  "of",
  "a",
  "an",
  "in",
  "to",
  "with",
  "that",
  "is",
  "he",
  "she",
  "we",
  "they",
  "his",
  "her",
  "their",
  "my",
  "thy",
  "for",
]);
const REPORT_ROOT = "data/reports";

interface OverrideTarget {
  book: string;
  chapter: number;
  verse: number;
}

interface SuggestedOverride {
  page: number;
  line: number;
  wordRange?: [number, number];
  target: OverrideTarget;
  note: string;
}

interface BleedFinding {
  type: "trailing-bleed" | "leading-bleed";
  book: string;
  chapter: number;
  verse: number;
  overlapTokens: string[];
  intoVerse: number;
  suggestedOverride: SuggestedOverride | null;
  url: string;
  /** Internal score used for ranking; not emitted in output. */
  _score?: number;
}

interface RatioFinding {
  type: "token-ratio";
  book: string;
  chapter: number;
  verse: number;
  pmTokens: number;
  canonTokens: number;
  ratio: number;
  url: string;
}

interface SplitWordFinding {
  type: "split-word";
  book: string;
  chapter: number;
  /** The verse whose last token + next verse's first token form the joined word. */
  verse: number;
  nextVerse: number;
  joinedWord: string;
  url: string;
}

interface TrailingAmpersandFinding {
  type: "trailing-ampersand";
  book: string;
  chapter: number;
  verse: number;
  url: string;
}

interface LeadingFragmentFinding {
  type: "leading-fragment";
  book: string;
  chapter: number;
  verse: number;
  fragment: string;
  url: string;
}

type Finding =
  | BleedFinding
  | RatioFinding
  | SplitWordFinding
  | TrailingAmpersandFinding
  | LeadingFragmentFinding;

function verseWords(verse: Verse): string[] {
  if (verse.lines) {
    return normalize(verse.lines.map((l: VerseLine) => l.text).join(" "));
  }
  return normalize(verse.text ?? "");
}

function buildUrl(
  siteUrl: string,
  version: string,
  book: string,
  chapter: number,
  verse: number,
  intoVerse?: number,
): string {
  const markEnd = intoVerse ?? verse;
  const markStart = intoVerse !== undefined ? verse : verse;
  return `${siteUrl}/${book}/${chapter}?v1=${version}&v2=2013&mark=${markStart}-${markEnd}#v-${verse}`;
}

// Find the page/line and word range for a set of tokens within a verse's lines,
// scanning from the given end ("front" for leading, "back" for trailing).
// Uses raw source tokenization (same as tokenize-source.ts) to get accurate
// word indices — avoids off-by-one errors caused by ◊-joined tokens like
// "say◊th" that normalize() would split but tokenizeSource keeps as one word.
async function resolveLineForTokens(
  version: string,
  verse: Verse,
  tokens: string[],
  side: "front" | "back",
): Promise<
  { page: number; line: number; wordRange?: [number, number] } | null
> {
  if (!verse.lines || verse.lines.length === 0) return null;
  const lines = side === "back" ? [...verse.lines].reverse() : verse.lines;
  for (const l of lines) {
    // Load the raw page file and look up this exact line to get the canonical
    // raw text (which may differ from l.text stored in the aligned JSON after
    // markdown stripping / stitch processing).
    const rawEntries = await loadRawPage(version, l.page);
    const rawEntry = rawEntries.find(
      (e) => e.chapter === l.page && e.verse === l.line,
    );
    // Fall back to the aligned text if the raw entry isn't available.
    const rawText = rawEntry?.text ?? l.text;
    const lineWords = tokenizeRawLine(rawText);
    const lineNorms = lineWords.map((w) => w.norm);
    // Check if all overlap tokens appear in this line.
    const lineSet = new Set(lineNorms);
    if (tokens.every((t) => lineSet.has(t))) {
      // Find the word-index range within the line using raw indices.
      const tokenSet = new Set(tokens);
      const matched = lineWords.filter((w) => tokenSet.has(w.norm));
      if (matched.length > 0) {
        const lo = matched[0].index;
        const hi = matched[matched.length - 1].index;
        return {
          page: l.page,
          line: l.line,
          wordRange: lo === hi ? undefined : [lo, hi],
        };
      }
      return { page: l.page, line: l.line };
    }
  }
  // Fallback: pick the last/first line even without a full token match.
  const fallback = side === "back"
    ? verse.lines[verse.lines.length - 1]
    : verse.lines[0];
  return { page: fallback.page, line: fallback.line };
}

async function analyzeChapter(
  version: string,
  book: string,
  chapter: number,
  aligned: Verse[],
  canonical: Verse[],
  siteUrl: string,
): Promise<Finding[]> {
  const canonByVerse = new Map(canonical.map((v) => [v.verse, v]));
  // All normalized words that appear in the canonical chapter — used to filter
  // fragment tokens caused by PM line breaks splitting a word mid-character.
  const canonVocab = new Set(canonical.flatMap((v) => normalize(v.text ?? "")));
  const findings: Finding[] = [];

  const bleedCandidates: BleedFinding[] = [];
  // Track trailing-bleed boundaries keyed by "verse->intoVerse" for symmetric cancellation.
  const trailingBoundaries = new Map<string, Set<string>>();
  const ratioCandidates: RatioFinding[] = [];

  for (const pmVerse of aligned) {
    if (pmVerse.verse === 0) continue; // skip headings
    const canon = canonByVerse.get(pmVerse.verse);
    if (!canon) continue;

    const pmWords = verseWords(pmVerse);
    const canonWords = normalize(canon.text ?? "");

    // Token-ratio check.
    if (canonWords.length >= 3) {
      const ratio = pmWords.length / canonWords.length;
      if (ratio < RATIO_LO || ratio > RATIO_HI) {
        ratioCandidates.push({
          type: "token-ratio",
          book,
          chapter,
          verse: pmVerse.verse,
          pmTokens: pmWords.length,
          canonTokens: canonWords.length,
          ratio,
          url: buildUrl(siteUrl, version, book, chapter, pmVerse.verse),
        });
      }
    }

    // Trailing-bleed check: do the last K words of PM verse overlap the first
    // K words of canonical verse+1?
    const nextCanon = canonByVerse.get(pmVerse.verse + 1);
    if (nextCanon) {
      const pmTail = pmWords.slice(-K);
      const canonNextHead = normalize(nextCanon.text ?? "").slice(0, K);
      const overlap = pmTail
        .filter((w) => canonNextHead.includes(w))
        .filter((w) => canonVocab.has(w)); // drop line-break fragments
      if (overlap.length > 0 && !overlap.every((w) => STOP_WORDS.has(w))) {
        const resolved = await resolveLineForTokens(
          version,
          pmVerse,
          overlap,
          "back",
        );
        bleedCandidates.push({
          type: "trailing-bleed",
          book,
          chapter,
          verse: pmVerse.verse,
          overlapTokens: overlap,
          intoVerse: pmVerse.verse + 1,
          suggestedOverride: resolved
            ? {
              page: resolved.page,
              line: resolved.line,
              ...(resolved.wordRange ? { wordRange: resolved.wordRange } : {}),
              target: { book, chapter, verse: pmVerse.verse + 1 },
              note: `trailing-bleed: '${
                overlap.join(" ")
              }' at end of v${pmVerse.verse} overlaps start of canonical v${
                pmVerse.verse + 1
              }`,
            }
            : null,
          url: buildUrl(
            siteUrl,
            version,
            book,
            chapter,
            pmVerse.verse,
            pmVerse.verse + 1,
          ),
        });
        // Record for symmetric cancellation.
        trailingBoundaries.set(
          `${pmVerse.verse}->${pmVerse.verse + 1}`,
          new Set(overlap),
        );
      }
    }

    // Leading-bleed check A: do the first K words of PM verse overlap the last
    // K words of canonical verse-1?
    const prevCanon = canonByVerse.get(pmVerse.verse - 1);
    if (prevCanon && pmVerse.verse - 1 > 0) {
      const pmHead = pmWords.slice(0, K);
      const canonPrevTail = normalize(prevCanon.text ?? "").slice(-K);
      const overlap = pmHead
        .filter((w) => canonPrevTail.includes(w))
        .filter((w) => canonVocab.has(w)); // drop line-break fragments
      // Symmetric cancellation: if the same boundary already fired as a
      // trailing-bleed with overlapping tokens, the word belongs at the
      // boundary in both manuscripts — not a misalignment.
      const mirrorKey = `${pmVerse.verse - 1}->${pmVerse.verse}`;
      const mirrorTokens = trailingBoundaries.get(mirrorKey);
      const isSymmetric = mirrorTokens &&
        overlap.some((w) => mirrorTokens.has(w));
      if (
        overlap.length > 0 && !overlap.every((w) => STOP_WORDS.has(w)) &&
        !isSymmetric
      ) {
        const resolved = await resolveLineForTokens(
          version,
          pmVerse,
          overlap,
          "front",
        );
        bleedCandidates.push({
          type: "leading-bleed",
          book,
          chapter,
          verse: pmVerse.verse,
          overlapTokens: overlap,
          intoVerse: pmVerse.verse - 1,
          suggestedOverride: resolved
            ? {
              page: resolved.page,
              line: resolved.line,
              ...(resolved.wordRange ? { wordRange: resolved.wordRange } : {}),
              target: { book, chapter, verse: pmVerse.verse - 1 },
              note: `leading-bleed: '${
                overlap.join(" ")
              }' at start of v${pmVerse.verse} overlaps end of canonical v${
                pmVerse.verse - 1
              }`,
            }
            : null,
          url: buildUrl(
            siteUrl,
            version,
            book,
            chapter,
            pmVerse.verse - 1,
            pmVerse.verse,
          ),
        });
      }
    }

    // Leading-bleed check B (shifted start): PM verse starts one word earlier
    // than the canonical verse. Catches cases like PM v12 starting with "it"
    // when canon v12 starts "And it came to pass..." — the "it" completes the
    // prior verse's sentence and doesn't appear at the end of canon v-1.
    if (prevCanon && pmVerse.verse - 1 > 0) {
      const pmHead = pmWords.slice(0, K);
      const canonHead = normalize(canon.text ?? "").slice(0, K);
      if (
        pmHead.length >= 2 && canonHead.length >= 2 &&
        pmHead[0] !== canonHead[0]
      ) {
        // Check if PM[1:] aligns well with canon[0:]
        const pmShifted = pmHead.slice(1);
        const shiftedOverlap = pmShifted.filter((w, i) => canonHead[i] === w);
        if (
          shiftedOverlap.length >= 2 &&
          canonVocab.has(pmHead[0]) &&
          !STOP_WORDS.has(pmHead[0])
        ) {
          const extraWords = [pmHead[0]];
          const resolved = await resolveLineForTokens(
            version,
            pmVerse,
            extraWords,
            "front",
          );
          bleedCandidates.push({
            type: "leading-bleed",
            book,
            chapter,
            verse: pmVerse.verse,
            overlapTokens: extraWords,
            intoVerse: pmVerse.verse - 1,
            suggestedOverride: resolved
              ? {
                page: resolved.page,
                line: resolved.line,
                ...(resolved.wordRange
                  ? { wordRange: resolved.wordRange }
                  : {}),
                target: { book, chapter, verse: pmVerse.verse - 1 },
                note: `shifted-start: '${
                  extraWords.join(" ")
                }' at start of v${pmVerse.verse} belongs to v${
                  pmVerse.verse - 1
                } (canon v${pmVerse.verse} starts '${
                  canonHead.slice(0, 3).join(" ")
                }')`,
              }
              : null,
            url: buildUrl(
              siteUrl,
              version,
              book,
              chapter,
              pmVerse.verse - 1,
              pmVerse.verse,
            ),
            // Score by the aligned-portion length, not the 1 extra word.
            _score: shiftedOverlap.length,
          });
        }
      }
    }
  }

  // Remove trailing-bleed candidates that turned out to be symmetric
  // (their mirror leading-bleed was suppressed above, but the trailing entry
  // was already added before we saw the leading side).
  const survivingBleeds = bleedCandidates.filter((c) => {
    if (c.type !== "trailing-bleed") return true;
    // If this boundary exists in trailingBoundaries as a LEADING finding
    // candidate that was suppressed, we need to also suppress the trailing side.
    // We detect this by checking if the leading side would have been symmetric:
    // a leading-bleed on c.intoVerse from c.verse was blocked → the trailing
    // mirror shares tokens → cancel.
    const mirrorTokens = trailingBoundaries.get(`${c.verse}->${c.intoVerse}`);
    if (!mirrorTokens) return true;
    // Check if leading check A would have fired symmetrically.
    const leadVerse = c.intoVerse;
    const leadCanon = canonByVerse.get(leadVerse);
    if (!leadVerse || !leadCanon) return true;
    const pmLeadVerse = aligned.find((v) => v.verse === leadVerse);
    if (!pmLeadVerse) return true;
    const pmHead = verseWords(pmLeadVerse).slice(0, K);
    const canonPrevTail = normalize(
      canonByVerse.get(leadVerse - 1)?.text ?? "",
    ).slice(-K);
    const mirrorOverlap = pmHead.filter((w) =>
      canonPrevTail.includes(w) && mirrorTokens.has(w)
    );
    return mirrorOverlap.length === 0;
  });

  // Keep top 2 bleed candidates per chapter (highest score first). Shifted-start
  // findings use _score (aligned-portion length) so a 4-word alignment beats a
  // 2-word raw overlap. Deduplicate so the same verse boundary isn't emitted twice.
  survivingBleeds.sort((a, b) =>
    (b._score ?? b.overlapTokens.length) - (a._score ?? a.overlapTokens.length)
  );
  const seenBoundaries = new Set<string>();
  for (const c of survivingBleeds) {
    const key = `${c.verse}-${c.intoVerse}`;
    if (seenBoundaries.has(key)) continue;
    seenBoundaries.add(key);
    delete c._score;
    findings.push(c);
    if (seenBoundaries.size >= 2) break;
  }

  // Keep top 1 ratio candidate per chapter (by deviation from expected range).
  ratioCandidates.sort((a, b) => {
    const devA = Math.max(RATIO_HI / a.ratio, a.ratio / RATIO_LO);
    const devB = Math.max(RATIO_HI / b.ratio, b.ratio / RATIO_LO);
    return devB - devA;
  });
  if (ratioCandidates.length > 0) findings.push(ratioCandidates[0]);

  // Split-word detection: for each verse boundary V / V+1, check whether
  // lastToken(V) + firstToken(V+1) concatenated forms a word in the canonical
  // vocabulary. If so, the line break has split a word across verses.
  const alignedByVerse = new Map(aligned.map((v) => [v.verse, v]));
  const sortedVerses = [...alignedByVerse.keys()].sort((a, b) => a - b);
  for (let i = 0; i < sortedVerses.length - 1; i++) {
    const vNum = sortedVerses[i];
    const nextVNum = sortedVerses[i + 1];
    if (vNum === 0) continue;
    const pmVerse = alignedByVerse.get(vNum)!;
    const pmNext = alignedByVerse.get(nextVNum)!;
    const pmWords = verseWords(pmVerse);
    const pmNextWords = verseWords(pmNext);
    if (pmWords.length === 0 || pmNextWords.length === 0) continue;
    const lastTok = pmWords[pmWords.length - 1];
    const firstTok = pmNextWords[0];
    const joined = lastTok + firstTok;
    if (canonVocab.has(joined)) {
      findings.push({
        type: "split-word",
        book,
        chapter,
        verse: vNum,
        nextVerse: nextVNum,
        joinedWord: joined,
        url: buildUrl(siteUrl, version, book, chapter, vNum, nextVNum),
      });
    }
  }

  // Boundary quality scan: inspect the aligned output directly for structural
  // artifacts that suggest a verse boundary is in the wrong place.
  for (const pmVerse of aligned) {
    if (pmVerse.verse === 0) continue;
    if (!pmVerse.lines || pmVerse.lines.length === 0) continue;

    // Trailing-ampersand: verse's last line ends with a standalone "&".
    const lastLine = pmVerse.lines[pmVerse.lines.length - 1];
    if (/(?:^|\s)&\s*$/.test(lastLine.text)) {
      findings.push({
        type: "trailing-ampersand",
        book,
        chapter,
        verse: pmVerse.verse,
        url: buildUrl(siteUrl, version, book, chapter, pmVerse.verse),
      });
    }

    // Leading-fragment: verse's first line starts with a token shorter than
    // 3 chars that doesn't appear standalone in the canonical vocabulary.
    const firstLine = pmVerse.lines[0];
    const firstRawToken = firstLine.text.trim().split(/\s+/)[0] ?? "";
    const firstNorm = normalizeSourceWord(firstRawToken);
    if (
      firstNorm.length > 0 &&
      firstNorm.length < 3 &&
      !canonVocab.has(firstNorm)
    ) {
      findings.push({
        type: "leading-fragment",
        book,
        chapter,
        verse: pmVerse.verse,
        fragment: firstNorm,
        url: buildUrl(siteUrl, version, book, chapter, pmVerse.verse),
      });
    }
  }

  return findings;
}

async function listBooks(version: string): Promise<string[]> {
  const dir = `data/bom/${version}`;
  const out: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (
        entry.isDirectory &&
        (BOOK_ORDER as readonly string[]).includes(entry.name)
      ) out.push(entry.name);
    }
  } catch { /* missing */ }
  return out.sort(
    (a, b) =>
      BOOK_ORDER.indexOf(a as typeof BOOK_ORDER[number]) -
      BOOK_ORDER.indexOf(b as typeof BOOK_ORDER[number]),
  );
}

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
  } catch { /* missing */ }
  return nums.sort((a, b) => a - b);
}

async function main() {
  const [version, book, chapter] = Deno.args;
  if (!version) {
    console.error(
      "Usage: deno run -A scripts/align-suggest-overrides.ts <version> [book] [chapter]",
    );
    Deno.exit(1);
  }

  const siteUrl = getSiteUrl();
  const books = book ? [book] : await listBooks(version);
  const allFindings: Finding[] = [];

  for (const b of books) {
    const chapters = chapter
      ? [Number(chapter)]
      : await listChapters(version, b);
    for (const c of chapters) {
      const aligned = await loadChapter(version, b, String(c));
      const canonical = await loadChapter("2013", b, String(c));
      if (aligned.length === 0 || canonical.length === 0) continue;
      const found = await analyzeChapter(
        version,
        b,
        c,
        aligned,
        canonical,
        siteUrl,
      );
      allFindings.push(...found);
      if (found.length > 0) {
        console.log(`${b} ${c}: ${found.length} finding(s)`);
      }
    }
  }

  const outDir = `${REPORT_ROOT}/${version}`;
  await Deno.mkdir(outDir, { recursive: true });
  const outPath = `${outDir}/override-suggestions.md`;
  await Deno.writeTextFile(outPath, buildMarkdown(version, allFindings));

  console.log(
    `\nWrote ${allFindings.length} finding(s) to ${outPath}`,
  );
}

function buildMarkdown(version: string, findings: Finding[]): string {
  const lines: string[] = [
    `# ${version.toUpperCase()} Override Suggestions`,
    `_Generated: ${new Date().toISOString().slice(0, 10)}_`,
    "",
    "Mark each finding: `[ ]` = unreviewed · `[x]` = fix · `[-]` = skip",
    "",
  ];

  // Group by book.
  const byBook = new Map<string, Finding[]>();
  for (const f of findings) {
    const b = f.book;
    if (!byBook.has(b)) byBook.set(b, []);
    byBook.get(b)!.push(f);
  }

  for (const [book, bookFindings] of byBook) {
    lines.push(`## ${book}`);
    lines.push("");
    for (const f of bookFindings) {
      if (f.type === "token-ratio") {
        lines.push(
          `- [ ] **ch${f.chapter} v${f.verse}** token-ratio \`${
            f.ratio.toFixed(2)
          }\` (pm:${f.pmTokens} canon:${f.canonTokens}) — [view](${f.url})`,
        );
      } else if (f.type === "split-word") {
        lines.push(
          `- [ ] **ch${f.chapter} v${f.verse}→${f.nextVerse}** split-word \`${f.joinedWord}\` — [view](${f.url})`,
        );
      } else if (f.type === "trailing-ampersand") {
        lines.push(
          `- [ ] **ch${f.chapter} v${f.verse}** trailing-ampersand — [view](${f.url})`,
        );
      } else if (f.type === "leading-fragment") {
        lines.push(
          `- [ ] **ch${f.chapter} v${f.verse}** leading-fragment \`${f.fragment}\` — [view](${f.url})`,
        );
      } else {
        const dir = f.type === "trailing-bleed" ? "→" : "←";
        lines.push(
          `- [ ] **ch${f.chapter} v${f.verse}${dir}${f.intoVerse}** ${f.type} \`${
            f.overlapTokens.join(" ")
          }\` — [view](${f.url})`,
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

if (import.meta.main) {
  await main();
}
