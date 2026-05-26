// Detects misalignment between an aligned manuscript chapter
// (data/bom/<version>/<book>/<ch>.json) and the canonical 2013 chapter.
//
// The algorithm:
//   1. Tokenize every verse of the aligned chapter into normalized words,
//      remembering which aligned verse each word came from.
//   2. Tokenize the canonical 2013 chapter the same way, plus the last verse
//      of the previous chapter and the first verse of the next chapter so we
//      can spot chapter-boundary bleed.
//   3. Run word-level LCS to map aligned tokens to canonical tokens.
//   4. For each aligned verse, inspect which canonical verse its words ended
//      up matching. Emit findings for leading/trailing bleed, major
//      misalignment, and cross-chapter bleed.

import type { Verse, VerseLine } from "../../lib/data.ts";

export interface AlignedToken {
  word: string;
  alignedVerse: number;
  /** 0-based position within the aligned verse. */
  posInVerse: number;
}

export interface CanonicalToken {
  word: string;
  canonicalChapter: number;
  canonicalVerse: number;
}

export interface Match {
  alignedIdx: number;
  canonicalIdx: number;
}

export type FindingType =
  | "leading-bleed"
  | "trailing-bleed"
  | "major-misalignment"
  | "chapter-bleed"
  | "split-word-bleed";

export interface Finding {
  type: FindingType;
  /** Verse the bleed leaks into (relative to expected). For chapter-bleed,
   * the target chapter. */
  intoVerse?: number;
  intoChapter?: number;
  /** The offending normalized tokens, in order. */
  tokens: string[];
  /** Histogram of canonical verses this aligned verse mapped into (verse →
   * count). Present on major-misalignment for context. */
  histogram?: Record<string, number>;
}

export interface InternalSplit {
  /** The joined canonical word, e.g. "righteousness". */
  word: string;
  /** 0-based index of the line break inside the verse where the split lives
   * (i.e. the gap between line `lineIndex` and `lineIndex + 1`). */
  lineIndex: number;
}

export interface VerseReport {
  verse: number;
  totalTokens: number;
  matchedToExpected: number;
  unmatched: number;
  histogram: Record<string, number>;
  findings: Finding[];
  /** Mid-word line breaks within this verse. The aligner currently inserts a
   * space between every line, which means these words come out with a
   * spurious space (e.g. "righteous ness"). Cataloged here so the aligner can
   * be updated to elide that space. */
  internalSplits: InternalSplit[];
}

export interface ChapterReport {
  version: string;
  book: string;
  chapter: number;
  verses: VerseReport[];
  summary: {
    totalVerses: number;
    versesWithFindings: number;
    findingsByType: Record<FindingType, number>;
    internalSplitCount: number;
  };
}

const WORD_RE = /[a-z0-9]+/g;

export function normalize(text: string): string[] {
  return text.toLowerCase().replace(/&/g, " and ").match(WORD_RE) ?? [];
}

export function verseText(verse: Verse): string {
  if (verse.lines) {
    return verse.lines.map((l: VerseLine) => l.text).join(" ");
  }
  return verse.text ?? "";
}

export function tokenizeAligned(chapter: Verse[]): AlignedToken[] {
  const out: AlignedToken[] = [];
  for (const v of chapter) {
    const words = normalize(verseText(v));
    for (let i = 0; i < words.length; i++) {
      out.push({ word: words[i], alignedVerse: v.verse, posInVerse: i });
    }
  }
  return out;
}

export function tokenizeCanonical(
  chapter: Verse[],
  chapterNum: number,
  prevChapterLastVerse?: Verse,
  prevChapterNum?: number,
  nextChapterFirstVerse?: Verse,
  nextChapterNum?: number,
): CanonicalToken[] {
  const out: CanonicalToken[] = [];
  if (prevChapterLastVerse && prevChapterNum !== undefined) {
    for (const w of normalize(verseText(prevChapterLastVerse))) {
      out.push({
        word: w,
        canonicalChapter: prevChapterNum,
        canonicalVerse: prevChapterLastVerse.verse,
      });
    }
  }
  for (const v of chapter) {
    for (const w of normalize(verseText(v))) {
      out.push({
        word: w,
        canonicalChapter: chapterNum,
        canonicalVerse: v.verse,
      });
    }
  }
  if (nextChapterFirstVerse && nextChapterNum !== undefined) {
    for (const w of normalize(verseText(nextChapterFirstVerse))) {
      out.push({
        word: w,
        canonicalChapter: nextChapterNum,
        canonicalVerse: nextChapterFirstVerse.verse,
      });
    }
  }
  return out;
}

/**
 * Standard word-level LCS that returns the list of matched index pairs.
 * O(m*n) time and space. Chapters cap out under ~2000 tokens per side, so
 * this is comfortable.
 */
export function lcs(
  a: AlignedToken[],
  b: CanonicalToken[],
): Match[] {
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return [];

  // Length table
  const dp: Uint32Array[] = new Array(m + 1);
  for (let i = 0; i <= m; i++) dp[i] = new Uint32Array(n + 1);

  for (let i = 1; i <= m; i++) {
    const ai = a[i - 1].word;
    const row = dp[i];
    const prev = dp[i - 1];
    for (let j = 1; j <= n; j++) {
      row[j] = ai === b[j - 1].word
        ? prev[j - 1] + 1
        : Math.max(prev[j], row[j - 1]);
    }
  }

  const matches: Match[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1].word === b[j - 1].word) {
      matches.push({ alignedIdx: i - 1, canonicalIdx: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  matches.reverse();
  return matches;
}

const BLEED_RUN_THRESHOLD = 1;
const MAJOR_MISALIGN_FRAC = 0.5;

export function detectFindings(
  aligned: AlignedToken[],
  canonical: CanonicalToken[],
  matches: Match[],
  expectedChapter: number,
): VerseReport[] {
  // Per-aligned-token, what canonical token (if any) it matched.
  const matchedCanonical: (CanonicalToken | null)[] = new Array(aligned.length)
    .fill(null);
  for (const m of matches) {
    matchedCanonical[m.alignedIdx] = canonical[m.canonicalIdx];
  }

  // Bucket aligned token indexes by aligned verse.
  const byVerse = new Map<number, number[]>();
  for (let i = 0; i < aligned.length; i++) {
    const v = aligned[i].alignedVerse;
    let arr = byVerse.get(v);
    if (!arr) {
      arr = [];
      byVerse.set(v, arr);
    }
    arr.push(i);
  }

  const reports: VerseReport[] = [];
  const verses = [...byVerse.keys()].sort((a, b) => a - b);

  for (const expected of verses) {
    const indices = byVerse.get(expected)!;
    const histogram: Record<string, number> = {};
    let matchedToExpected = 0;
    let unmatched = 0;

    for (const idx of indices) {
      const c = matchedCanonical[idx];
      if (!c) {
        unmatched++;
        continue;
      }
      if (
        c.canonicalChapter === expectedChapter && c.canonicalVerse === expected
      ) {
        matchedToExpected++;
      }
      const key = c.canonicalChapter === expectedChapter
        ? String(c.canonicalVerse)
        : `${c.canonicalChapter}:${c.canonicalVerse}`;
      histogram[key] = (histogram[key] ?? 0) + 1;
    }

    const findings: Finding[] = [];

    // Leading bleed: walk forward through matched tokens until we hit
    // expected verse. If the prefix run consistently targets a smaller verse
    // (or prior chapter) and is at least the threshold long, flag it.
    findings.push(
      ...edgeBleed(
        aligned,
        matchedCanonical,
        indices,
        expected,
        expectedChapter,
        "leading",
      ),
    );
    findings.push(
      ...edgeBleed(
        aligned,
        matchedCanonical,
        indices,
        expected,
        expectedChapter,
        "trailing",
      ),
    );

    // Chapter bleed anywhere in the verse.
    const crossChapter = new Map<number, string[]>();
    for (const idx of indices) {
      const c = matchedCanonical[idx];
      if (c && c.canonicalChapter !== expectedChapter) {
        let arr = crossChapter.get(c.canonicalChapter);
        if (!arr) {
          arr = [];
          crossChapter.set(c.canonicalChapter, arr);
        }
        arr.push(aligned[idx].word);
      }
    }
    for (const [ch, tokens] of crossChapter) {
      if (tokens.length >= BLEED_RUN_THRESHOLD) {
        findings.push({
          type: "chapter-bleed",
          intoChapter: ch,
          tokens,
        });
      }
    }

    // Major misalignment: expected verse does not account for the plurality
    // of matched tokens, AND there are enough matches to be meaningful.
    const totalMatched = indices.length - unmatched;
    if (totalMatched >= BLEED_RUN_THRESHOLD) {
      const expectedKey = String(expected);
      const expectedCount = histogram[expectedKey] ?? 0;
      if (expectedCount / totalMatched < MAJOR_MISALIGN_FRAC) {
        const alreadyFlagged = findings.some((f) =>
          f.type === "leading-bleed" || f.type === "trailing-bleed"
        );
        // Only emit if no edge-bleed already explains it, OR if the verse
        // is dominantly mismatched (most words go elsewhere).
        if (!alreadyFlagged || expectedCount === 0) {
          findings.push({
            type: "major-misalignment",
            tokens: indices
              .filter((idx) => {
                const c = matchedCanonical[idx];
                return c &&
                  !(c.canonicalChapter === expectedChapter &&
                    c.canonicalVerse === expected);
              })
              .map((idx) => aligned[idx].word),
            histogram: { ...histogram },
          });
        }
      }
    }

    reports.push({
      verse: expected,
      totalTokens: indices.length,
      matchedToExpected,
      unmatched,
      histogram,
      findings,
      internalSplits: [],
    });
  }

  return reports;
}

function edgeBleed(
  aligned: AlignedToken[],
  matchedCanonical: (CanonicalToken | null)[],
  indices: number[],
  expected: number,
  expectedChapter: number,
  side: "leading" | "trailing",
): Finding[] {
  // Walk from the chosen edge of the verse. Skip unmatched tokens. Collect
  // a run of consecutive matched tokens that target a verse other than the
  // expected one. Stop as soon as we hit a token that DOES match the
  // expected verse — that token is the real start (or end) of the verse.
  const order = side === "leading" ? indices : [...indices].reverse();
  const wrongVerseTokens: string[] = [];
  let intoVerse: number | undefined;
  let wrongCanonicalDirection: "before" | "after" | null = null;

  for (const idx of order) {
    const c = matchedCanonical[idx];
    if (!c) continue;
    if (c.canonicalChapter !== expectedChapter) {
      // Cross-chapter is handled by chapter-bleed; stop walking here.
      break;
    }
    if (c.canonicalVerse === expected) {
      break;
    }
    const dir: "before" | "after" = c.canonicalVerse < expected
      ? "before"
      : "after";
    if (wrongCanonicalDirection === null) {
      wrongCanonicalDirection = dir;
      intoVerse = c.canonicalVerse;
    } else if (wrongCanonicalDirection !== dir) {
      break;
    }
    wrongVerseTokens.push(aligned[idx].word);
  }

  if (wrongVerseTokens.length < BLEED_RUN_THRESHOLD) return [];

  // Leading bleed should be content from the PRECEDING verse (before).
  // Trailing bleed should be content from the FOLLOWING verse (after).
  if (side === "leading" && wrongCanonicalDirection !== "before") return [];
  if (side === "trailing" && wrongCanonicalDirection !== "after") return [];

  const tokens = side === "leading"
    ? wrongVerseTokens
    : wrongVerseTokens.reverse();

  return [{
    type: side === "leading" ? "leading-bleed" : "trailing-bleed",
    intoVerse,
    tokens,
  }];
}

/**
 * Detects manuscript line breaks that land on a verse boundary mid-word
 * (e.g. v20 ends "...thy Br" and v21 starts "ethren shall..."). We can spot
 * this purely from the aligned `lines`: the last line of a verse ends without
 * trailing whitespace, meaning the word continues into the next verse's
 * first line.
 */
/** Confirm a candidate split by checking that the joined word actually
 * appears in the canonical text but neither fragment alone does. */
function isVerifiedSplit(
  prevLineText: string,
  nextLineText: string,
  canonicalWords: Set<string>,
): string | null {
  if (!/[A-Za-z0-9]$/.test(prevLineText)) return null;
  if (!/^[A-Za-z0-9]/.test(nextLineText)) return null;
  const tail = (prevLineText.match(/[A-Za-z0-9]+$/)?.[0] ?? "").toLowerCase();
  const head = (nextLineText.match(/^[A-Za-z0-9]+/)?.[0] ?? "").toLowerCase();
  if (!tail || !head) return null;
  const joined = tail + head;
  if (!canonicalWords.has(joined)) return null;
  if (canonicalWords.has(tail) && canonicalWords.has(head)) return null;
  return joined;
}

function attachSplitWordBleeds(
  verses: VerseReport[],
  aligned: Verse[],
  canonicalWords: Set<string>,
): void {
  const byVerse = new Map(verses.map((v) => [v.verse, v]));

  // Cross-verse splits: last line of verse N to first line of verse N+1.
  for (let i = 0; i < aligned.length - 1; i++) {
    const cur = aligned[i];
    const next = aligned[i + 1];
    if (!cur.lines?.length || !next.lines?.length) continue;
    const joined = isVerifiedSplit(
      cur.lines[cur.lines.length - 1].text,
      next.lines[0].text,
      canonicalWords,
    );
    if (joined) {
      byVerse.get(cur.verse)?.findings.push({
        type: "split-word-bleed",
        intoVerse: next.verse,
        tokens: [joined],
      });
    }
  }

  // Intra-verse splits: line break within a single verse that produces a
  // verified canonical word. The aligner joins lines with a space, so these
  // come out with a spurious space (e.g. "righteous ness" instead of
  // "righteousness"). Cataloged so the aligner can be fixed.
  for (const v of aligned) {
    if (!v.lines || v.lines.length < 2) continue;
    const report = byVerse.get(v.verse);
    if (!report) continue;
    for (let i = 0; i < v.lines.length - 1; i++) {
      const joined = isVerifiedSplit(
        v.lines[i].text,
        v.lines[i + 1].text,
        canonicalWords,
      );
      if (joined) {
        report.internalSplits.push({ word: joined, lineIndex: i });
      }
    }
  }
}

export interface BuildReportInput {
  version: string;
  book: string;
  chapter: number;
  aligned: Verse[];
  canonical: Verse[];
  prevCanonical?: Verse[];
  prevChapter?: number;
  nextCanonical?: Verse[];
  nextChapter?: number;
}

export function buildChapterReport(input: BuildReportInput): ChapterReport {
  const alignedTokens = tokenizeAligned(input.aligned);
  const canonicalTokens = tokenizeCanonical(
    input.canonical,
    input.chapter,
    input.prevCanonical?.at(-1),
    input.prevChapter,
    input.nextCanonical?.[0],
    input.nextChapter,
  );

  const matches = lcs(alignedTokens, canonicalTokens);
  const verses = detectFindings(
    alignedTokens,
    canonicalTokens,
    matches,
    input.chapter,
  );
  const canonicalWords = new Set(canonicalTokens.map((t) => t.word));
  attachSplitWordBleeds(verses, input.aligned, canonicalWords);

  const findingsByType: Record<FindingType, number> = {
    "leading-bleed": 0,
    "trailing-bleed": 0,
    "major-misalignment": 0,
    "chapter-bleed": 0,
    "split-word-bleed": 0,
  };
  let versesWithFindings = 0;
  let internalSplitCount = 0;
  for (const v of verses) {
    if (v.findings.length > 0) versesWithFindings++;
    for (const f of v.findings) findingsByType[f.type]++;
    internalSplitCount += v.internalSplits.length;
  }

  return {
    version: input.version,
    book: input.book,
    chapter: input.chapter,
    verses,
    summary: {
      totalVerses: verses.length,
      versesWithFindings,
      findingsByType,
      internalSplitCount,
    },
  };
}
