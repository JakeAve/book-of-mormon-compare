// Post-pass: when a SOURCE chapter-marker line (e.g. OM page 12 line 10
// "Chapter 3rd.——") got stuck trailing the previous canonical chapter's last
// verse, push it to the start of the next canonical chapter. We ONLY do this
// when the source content immediately following the marker is itself in a
// different canonical chapter — otherwise the cursor correctly placed the
// marker at the start of the source-chapter's content, and the source
// chapter division simply doesn't align with the canonical chapter division
// (common in 1830/1837 which have their own chapter numbering). Moving the
// marker in that case would push it across a real canonical verse boundary.

import { lineKey, verseKey } from "./line-key.ts";
import { isChapterMarkerLine } from "./headings.ts";
import type { CursorResult, LineInfo } from "./types.ts";
import type { VerseGroup } from "./tokenize-target.ts";

export function pushChapterMarkersForward(
  results: CursorResult[],
  verseGroups: VerseGroup[],
  lineInfos: Map<string, LineInfo>,
): CursorResult[] {
  const vgIdxByKey = new Map<string, number>();
  for (let i = 0; i < verseGroups.length; i++) {
    const vg = verseGroups[i];
    vgIdxByKey.set(verseKey(vg.book, vg.chapter, vg.verse), i);
  }

  const byLine = new Map<string, number[]>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const lk = lineKey(r.page, r.line);
    let arr = byLine.get(lk);
    if (!arr) {
      arr = [];
      byLine.set(lk, arr);
    }
    arr.push(i);
  }

  const out = results.slice();
  for (const [lk, indices] of byLine) {
    const info = lineInfos.get(lk);
    if (!info || !isChapterMarkerLine(info.text)) continue;

    // Inspect the chapters the line's tokens are currently in.
    let minVgIdx = Number.POSITIVE_INFINITY;
    let maxVgIdx = -1;
    let minChapter = Number.POSITIVE_INFINITY;
    let maxChapter = -1;
    let minBook = "";
    let maxBook = "";
    for (const i of indices) {
      const r = out[i];
      const idx = vgIdxByKey.get(
        verseKey(
          r.assignedVerse.book,
          r.assignedVerse.chapter,
          r.assignedVerse.verse,
        ),
      );
      if (idx === undefined) continue;
      if (idx < minVgIdx) {
        minVgIdx = idx;
        minBook = r.assignedVerse.book;
        minChapter = r.assignedVerse.chapter;
      }
      if (idx > maxVgIdx) {
        maxVgIdx = idx;
        maxBook = r.assignedVerse.book;
        maxChapter = r.assignedVerse.chapter;
      }
    }
    if (maxVgIdx < 0) continue;

    // Pick the target verseGroup for the whole line:
    //   - if the line straddles two chapters (min < max), consolidate at the
    //     FIRST verse of the LATER chapter
    //   - if the line is wholly in one chapter, only push forward when the
    //     NEXT SOURCE LINE is in a different canonical chapter (the marker
    //     is hanging at the end of the prev chapter's content). If the next
    //     source line continues in the same canonical chapter, the marker
    //     was correctly placed there and pushing would cross a real verse
    //     boundary (1830/1837's chapter system doesn't align with canon).
    let nextIdx = -1;
    if (minBook === maxBook && minChapter < maxChapter) {
      for (let i = minVgIdx + 1; i <= maxVgIdx; i++) {
        const vg = verseGroups[i];
        if (vg.book === maxBook && vg.chapter === maxChapter) {
          nextIdx = i;
          break;
        }
      }
    } else {
      // Find this line's last source-position index, then look at what canonical
      // chapter the FOLLOWING source position is assigned to.
      let lastIdxOfLine = -1;
      for (const i of indices) if (i > lastIdxOfLine) lastIdxOfLine = i;
      const nextResult = out[lastIdxOfLine + 1];
      if (!nextResult) continue;
      if (
        nextResult.assignedVerse.book === maxBook &&
        nextResult.assignedVerse.chapter === maxChapter
      ) {
        // Next source line stays in the marker's current canonical chapter —
        // marker is correctly placed at the START of the source-chapter's
        // content for this canonical chapter. Leave alone.
        continue;
      }
      for (let i = maxVgIdx + 1; i < verseGroups.length; i++) {
        const vg = verseGroups[i];
        if (vg.book !== maxBook) break;
        if (vg.chapter !== maxChapter) {
          nextIdx = i;
          break;
        }
      }
    }
    if (nextIdx < 0) continue;

    const target = verseGroups[nextIdx];
    for (const i of indices) {
      out[i] = {
        ...out[i],
        assignedVerse: {
          book: target.book,
          chapter: target.chapter,
          verse: target.verse,
        },
      };
    }
  }
  return out;
}

// Some editions (1840) print an explicit "CHAPTER I." marker right after a
// book's title, even though canon has no separate counterpart for it — verse
// 0 (the title) and the marker share no matched words, so the cursor's
// high-confidence path stops consuming right after the title and leaves the
// marker to bleed into verse 1's content instead. Reattach any chapter-marker
// line to the verse immediately preceding it in the source whenever that
// preceding verse is verse 0 of the very same chapter. Verse 0 only ever
// occurs as a book's title verse, so this can't fire on an ordinary
// mid-chapter large-chapter marker (e.g. 1830/1837's own numbering, which
// falls between two ordinary verses of the same canonical chapter and is
// already handled correctly by leaving it on the following verse).
const TITLE_VERSE = 0;
export function attachOrphanMarkersToPrecedingVerse(
  results: CursorResult[],
  lineInfos: Map<string, LineInfo>,
): CursorResult[] {
  const byLine = new Map<string, number[]>();
  for (let i = 0; i < results.length; i++) {
    const lk = lineKey(results[i].page, results[i].line);
    let arr = byLine.get(lk);
    if (!arr) {
      arr = [];
      byLine.set(lk, arr);
    }
    arr.push(i);
  }

  const out = results.slice();
  for (const [lk, indices] of byLine) {
    const info = lineInfos.get(lk);
    if (!info || !isChapterMarkerLine(info.text)) continue;

    const firstIdx = Math.min(...indices);
    if (firstIdx === 0) continue;
    const prev = out[firstIdx - 1].assignedVerse;
    const current = out[firstIdx].assignedVerse;
    if (
      prev.book === current.book &&
      prev.chapter === current.chapter &&
      prev.verse === TITLE_VERSE && current.verse > TITLE_VERSE
    ) {
      for (const i of indices) {
        out[i] = { ...out[i], assignedVerse: prev };
      }
    }
  }
  return out;
}
