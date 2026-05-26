import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// 1830 First Edition: the published edition. Generally CLOSE in length to the
// canonical 2013 text, but with notable textual variants — some clauses were
// dropped in 1830 and restored in later editions. When the source is shorter
// than canonical the LCS will spuriously extend matches into the next verse's
// source, so we enable tail-trim.
export const ed1830: SourceAdapter = {
  slug: "1830",
  label: "1830 First Edition",
  raw: "data/raw/1830",
  out: "data/bom/1830",
  cursor: {
    ...DEFAULT_CURSOR_CONFIG,
    tailGapFactor: 8,
    tailTrimMaxMatchFraction: 0.7,
  },
};
