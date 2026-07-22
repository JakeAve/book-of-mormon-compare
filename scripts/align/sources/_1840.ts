import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// 1840 Nauvoo Edition: the third edition, published in Nauvoo under Joseph
// Smith's supervision from a copy of the 1837 edition he had corrected
// against the Original Manuscript. Textually the closest early edition to
// the canonical text — start with the same tuning as 1837.
const ed1840: SourceAdapter = {
  slug: "1840",
  label: "1840 Nauvoo Edition",
  raw: "data/raw/1840",
  out: "data/bom/1840",
  cursor: {
    ...DEFAULT_CURSOR_CONFIG,
    tailGapFactor: 8,
    tailTrimMaxMatchFraction: 0.85,
  },
};

export default ed1840;
