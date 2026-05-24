import { matches } from "./match.ts";
import type { CursorResult, SourceWord } from "./types.ts";
import type { VerseGroup } from "./tokenize-target.ts";

const WINDOW_NORMAL = 150;
const WINDOW_WIDE = 400;
const STUCK_THRESHOLD = 0.3;
const STUCK_CONSECUTIVE = 2;

interface LCSResult {
  /** Index into the source window of the first matched source word. -1 if no matches. */
  firstMatchedIdx: number;
  /** Index into the source window of the last matched source word. -1 if no matches. */
  lastMatchedIdx: number;
  matchedCount: number;
}

function windowLCS(verseNorms: string[], window: SourceWord[]): LCSResult {
  const m = verseNorms.length;
  const n = window.length;
  if (m === 0 || n === 0) {
    return { firstMatchedIdx: -1, lastMatchedIdx: -1, matchedCount: 0 };
  }

  // O(m*n) DP — m ≤ ~100 verse words, n ≤ 400 window words: at most 40k cells
  const dp: Uint16Array[] = Array.from(
    { length: m + 1 },
    () => new Uint16Array(n + 1),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = matches(window[j - 1].norm, verseNorms[i - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to find first and last matched source indices
  let i = m;
  let j = n;
  let firstMatchedIdx = -1;
  let lastMatchedIdx = -1;
  let matchedCount = 0;
  while (i > 0 && j > 0) {
    if (matches(window[j - 1].norm, verseNorms[i - 1])) {
      // Backtracking finds matches in reverse — last in source = first we encounter
      if (lastMatchedIdx === -1) lastMatchedIdx = j - 1;
      firstMatchedIdx = j - 1; // always update — last update is the smallest index
      matchedCount++;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return { firstMatchedIdx, lastMatchedIdx, matchedCount };
}

export function runCursor(
  source: SourceWord[],
  verseGroups: VerseGroup[],
): CursorResult[] {
  if (source.length === 0 || verseGroups.length === 0) return [];

  const result: CursorResult[] = [];
  let cursor = 0;
  let stuckCount = 0;

  for (const vg of verseGroups) {
    if (cursor >= source.length) break;
    const verseNorms = vg.words.map((w) => w.norm);

    // Try normal window first; widen if stuck
    let windowSize = WINDOW_NORMAL;
    let lcs = windowLCS(verseNorms, source.slice(cursor, cursor + windowSize));
    const quality = verseNorms.length > 0
      ? lcs.matchedCount / verseNorms.length
      : 1;

    if (quality < STUCK_THRESHOLD) {
      stuckCount++;
      if (stuckCount >= STUCK_CONSECUTIVE) {
        windowSize = WINDOW_WIDE;
        lcs = windowLCS(verseNorms, source.slice(cursor, cursor + windowSize));
        const wideQuality = verseNorms.length > 0
          ? lcs.matchedCount / verseNorms.length
          : 1;
        if (wideQuality < STUCK_THRESHOLD) {
          console.warn(
            `align2 cursor stuck at ${vg.book} ${vg.chapter}:${vg.verse} — fallback advance`,
          );
          const advance = Math.min(verseNorms.length, source.length - cursor);
          for (let k = 0; k < advance; k++) {
            result.push({
              ...source[cursor + k],
              assignedVerse: {
                book: vg.book,
                chapter: vg.chapter,
                verse: vg.verse,
              },
            });
          }
          cursor += advance;
          stuckCount = 0;
          continue;
        }
        stuckCount = 0;
      }
    } else {
      stuckCount = 0;
    }

    // Consume source words up through the last matched position, capped to prevent
    // over-consumption when common words (e.g. "and", "the") appear far into the window
    // and inflate lastMatchedIdx. Cap the total advance to ~1.5× the verse length so
    // the cursor stays close to the true verse boundary regardless of window position.
    const newCursor = lcs.lastMatchedIdx >= 0
      ? cursor + Math.min(
        lcs.lastMatchedIdx + 1,
        Math.max(Math.round(verseNorms.length * 1.0), 5),
      )
      : cursor;

    for (let k = cursor; k < newCursor; k++) {
      result.push({
        ...source[k],
        assignedVerse: { book: vg.book, chapter: vg.chapter, verse: vg.verse },
      });
    }
    cursor = newCursor;
  }

  // Assign remaining source words to the last verse
  if (cursor < source.length) {
    const lastVg = verseGroups[verseGroups.length - 1];
    for (let k = cursor; k < source.length; k++) {
      result.push({
        ...source[k],
        assignedVerse: {
          book: lastVg.book,
          chapter: lastVg.chapter,
          verse: lastVg.verse,
        },
      });
    }
  }

  return result;
}
