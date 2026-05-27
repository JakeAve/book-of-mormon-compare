import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// 1837 Second Edition: Joseph Smith's revision of the 1830 edition. Closer to
// the canonical 2013 text than 1830 (many 1830 variants were restored), but
// not identical — start with the same tail-trim posture as 1830 and tune
// against the report.
const ed1837: SourceAdapter = {
  slug: "1837",
  label: "1837 Second Edition",
  raw: "data/raw/1837",
  out: "data/bom/1837",
  cursor: {
    ...DEFAULT_CURSOR_CONFIG,
    tailGapFactor: 8,
    tailTrimMaxMatchFraction: 0.85,
  },
};

export default ed1837;
