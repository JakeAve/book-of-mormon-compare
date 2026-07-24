import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// 1830 First Edition: the published edition. Generally CLOSE in length to the
// canonical 2013 text, but with notable textual variants — some clauses were
// dropped in 1830 and restored in later editions. When the source is shorter
// than canonical the LCS will spuriously extend matches into the next verse's
// source, so we enable tail-trim.
const ed1830: SourceAdapter = {
  slug: "1830",
  label: "1830 First Edition",
  raw: "data/raw/1830",
  out: "data/bom/1830",
  cursor: {
    ...DEFAULT_CURSOR_CONFIG,
    tailGapFactor: 8,
    tailTrimMaxMatchFraction: 0.7,
  },
  overrides: [
    {
      page: 19,
      line: 2,
      wordIndices: [9],
      target: { book: "1-ne", chapter: 4, verse: 17 },
      note:
        "1830 printer's error 'commmand-/ments.' (triple m, per facsimile) " +
        "splits across the verse boundary; the merged form isn't canonical so " +
        "the aligner can't match it to 'commandments' at the end of 4:17.",
    },
    {
      page: 19,
      line: 3,
      wordIndices: [0],
      target: { book: "1-ne", chapter: 4, verse: 17 },
      note: "Second fragment of 'commmand-/ments.' — belongs with 4:17.",
    },
  ],
};

export default ed1830;
