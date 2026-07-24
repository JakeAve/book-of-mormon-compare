import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// 1841 Liverpool Edition: the first European edition, published in Liverpool
// by Brigham Young, Heber C. Kimball, and Parley P. Pratt. Typeset from a
// copy of the 1837 edition (the 1840 revisions had not reached England), so
// start with the same tuning as 1837/1840.
const ed1841: SourceAdapter = {
  slug: "1841",
  label: "1841 Liverpool Edition",
  raw: "data/raw/1841",
  out: "data/bom/1841",
  // Unlike the American editions, the witness testimonies are front matter
  // (pages 7-8, right after the title page) rather than back matter.
  bookOrder: [
    "title-page",
    "witnesses",
    "1-ne",
    "2-ne",
    "jacob",
    "enos",
    "jarom",
    "omni",
    "w-of-m",
    "mosiah",
    "alma",
    "hel",
    "3-ne",
    "4-ne",
    "morm",
    "ether",
    "moro",
  ],
  allCapsBookTitles: true,
  // The title page's printer imprint ("First European, from the Second
  // American Edition. PRINTED BY J. TOMPKINS...") has no canonical
  // counterpart, so the cursor shoves it into the next verse group (the
  // witness testimonies). It is physically part of the title page.
  overrides: [
    ...[30, 31, 32, 33, 34, 35].map((line) => ({
      page: 5,
      line,
      target: { book: "title-page", chapter: 1, verse: 4 },
      note: "printer imprint at the foot of the title page",
    })),
    {
      page: 7,
      line: 1,
      target: { book: "witnesses", chapter: 1, verse: 1 },
      note:
        "canonical verse 1 is the testimony heading itself; the cursor lumps it with verse 2",
    },
  ],
  cursor: {
    ...DEFAULT_CURSOR_CONFIG,
    tailGapFactor: 8,
    tailTrimMaxMatchFraction: 0.85,
  },
};

export default ed1841;
