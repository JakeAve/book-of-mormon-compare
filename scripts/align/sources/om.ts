import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

// Original Manuscript (OM): the surviving fragments of the original dictation
// transcript (~28% of the BoM by extent). OM's coverage is fragmentary and
// jumps around canonical text — large stretches between surviving pages.
//
// The verse-level LCS cursor that works for PM/1830/1837 doesn't work here:
// it walks canon linearly, so OM source smears into canonical verses it has
// no content for, and drift compounds. Instead OM uses the SCAFFOLD algorithm
// — unique n-gram anchor pairs between source and target, monotone-LIS to
// reject cross-overs, piecewise-linear interpolation between anchors. Adapted
// from the legacy aligner1, which gets 89.9% token-purity on OM via this
// approach.
export const om: SourceAdapter = {
  slug: "om",
  label: "Original Manuscript",
  raw: "data/raw/om",
  out: "data/bom/om",
  algorithm: "scaffold",
  cursor: DEFAULT_CURSOR_CONFIG,
  scaffoldMinTokensPerVerse: 3,
  overrides: [
    {
      // OM page 196 line 30 reads `& it came to pass that when the servant
      // of Helaman...`. Canonical hel 2:7 ends "...might murder Helaman."
      // and canonical hel 2:8 starts "And when the servant of Helaman..." —
      // neither contains "and it came to pass", so this is OM-specific
      // filler with no canonical anchor. The scaffold puts `& it` with v7
      // and the rest with v8, but the whole line semantically belongs with
      // v8 (the filler introduces v8's content).
      page: 196,
      line: 30,
      target: { book: "hel", chapter: 2, verse: 8 },
      note: "OM filler `& it came to pass` between hel 2:7 and 2:8",
    },
  ],
};
