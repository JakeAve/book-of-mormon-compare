import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// Original Manuscript (OM): the surviving fragments of the original dictation
// transcript (~28% of the BoM by extent). Like PM the source is generally
// LONGER than canonical (scribal verbosity, raw dictation), so default tuning
// fits. Tail-trim stays off — OM doesn't have the dropped-clause profile of
// 1830/1837.
//
// OM is INCOMPLETE: only chapters from 1-ne, 2-ne, jacob, enos, alma, hel,
// 3-ne, and ether are partially present. The cursor still walks the full
// canonical book order; chapters not present in OM produce empty output.
export const om: SourceAdapter = {
  slug: "om",
  label: "Original Manuscript",
  raw: "data/raw/om",
  out: "data/bom/om-2",
  cursor: {
    ...DEFAULT_CURSOR_CONFIG,
    skipBelowMatchFraction: 0,
    anchorWindowWords: 50,
    anchorLookaheadVerses: 1,
    srcPerCanonOverride: 1.10,
  },
};
