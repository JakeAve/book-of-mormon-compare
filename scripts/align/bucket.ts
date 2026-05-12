// Bucket aligned fragments into per-verse buckets.
//
// Each `AlignedFragment` carries a verse range (start..end inclusive). To turn
// that into a "for each canonical verse, which fragments touch it?" mapping we
// need the canonical verse *sequence* — book and chapter alone aren't enough
// because chapters have variable verse counts. So callers pass the ordered
// list of target verses (the same one they fed into `align()`).

import type { AlignedFragment, TargetVerse } from "./types.ts";

export interface VerseBucket<F> {
  book: string;
  chapter: number;
  verse: number;
  /** Fragments whose verse range overlaps this verse, in source order. */
  items: F[];
}

export type BucketMode =
  /** Place each fragment in every verse its range overlaps. Same fragment can
   * appear in multiple consecutive verse files (good for "which lines mention
   * this verse?" queries, bad for stitching since text repeats). */
  | "spread"
  /** Place each fragment only in its starting verse. Each line appears exactly
   * once in the output tree; verses with no starting fragment get no entry. */
  | "startOnly";

const verseKey = (b: string, c: number, v: number) => `${b}|${c}|${v}`;

export function bucketByVerse<F extends AlignedFragment>(
  fragments: F[],
  verses: TargetVerse[],
  mode: BucketMode = "spread",
): VerseBucket<F>[] {
  const ord = new Map<string, number>();
  for (let i = 0; i < verses.length; i++) {
    ord.set(verseKey(verses[i].book, verses[i].chapter, verses[i].verse), i);
  }

  const byKey = new Map<string, F[]>();
  for (const f of fragments) {
    const lo = ord.get(verseKey(f.start.book, f.start.chapter, f.start.verse));
    const hi = ord.get(verseKey(f.end.book, f.end.chapter, f.end.verse));
    if (lo === undefined || hi === undefined) continue;
    const last = mode === "startOnly" ? lo : hi;
    for (let i = lo; i <= last; i++) {
      const v = verses[i];
      const k = verseKey(v.book, v.chapter, v.verse);
      let arr = byKey.get(k);
      if (!arr) byKey.set(k, arr = []);
      arr.push(f);
    }
  }

  const out: VerseBucket<F>[] = [];
  for (const v of verses) {
    const k = verseKey(v.book, v.chapter, v.verse);
    const items = byKey.get(k);
    if (!items) continue;
    out.push({ book: v.book, chapter: v.chapter, verse: v.verse, items });
  }
  return out;
}
