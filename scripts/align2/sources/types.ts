// Per-source configuration. Each manuscript / edition aligned by align2 plugs
// in its own paths and cursor tuning. Defaults preserve the original PM-tuned
// behavior so adding a new source can't regress PM.

export interface CursorConfig {
  /** Search window multiplier per canonical verse. */
  windowSlack: number;
  /** Minimum source-word window per canonical verse. */
  windowMin: number;
  /** Consume cap multiplier — at most this many source words per canonical word. */
  consumeSlack: number;
  /** Minimum source words consumed per canonical verse. */
  consumeMin: number;
  /** Match fraction at/above which we trust lastMatchedSrc directly (no cap). */
  highMatchFraction: number;
  /** Tail-trim threshold for spurious LCS matches: when a gap between two
   *  consecutive matched source positions exceeds this multiple of srcPerCanon
   *  (in the back half of the matches), drop the trailing matches. Set to 0
   *  to disable. Useful for sources with dropped clauses (e.g. 1830) where the
   *  LCS would otherwise extend into the next verse's source. */
  tailGapFactor: number;
  /** Tail-trim only fires when matchFraction is below this threshold. Verses
   *  with high match coverage are unlikely to have textual variants worth
   *  trimming. Set to 1 to always trim when tailGapFactor > 0. */
  tailTrimMaxMatchFraction: number;
  /** Skip canonical verses whose LCS match coverage is below this fraction.
   *  When triggered, the cursor advances vgIdx without consuming source —
   *  correct for sparse sources where the canonical verse simply has no
   *  corresponding source content. Common words like "and"/"the" cause low
   *  but nonzero match fractions in any verse, so a threshold above 0 is
   *  needed for incomplete sources. Set to 0 to disable (default; correct
   *  for complete sources like PM/1830/1837 where every canonical verse
   *  has a real source counterpart). */
  skipBelowMatchFraction: number;
  /** Anchor-search window: at the start of each segment, examine this many
   *  source words and find the canonical verse-group where they best match.
   *  Jump the cursor there before the per-verse LCS walk. Set to 0 to
   *  disable (default — correct for sources that cover canon linearly).
   *  Needed for fragmentary sources (OM) whose surviving fragments jump
   *  around canonical text. */
  anchorWindowWords: number;
  /** Number of verse-groups to combine into a candidate window when
   *  scoring an anchor position. Larger = more recall but anchor resolves
   *  to a vaguer chapter-level position. */
  anchorLookaheadVerses: number;
  /** Override the runtime-computed `srcPerCanon` ratio (source words /
   *  canonical words). Default null = auto-compute from totals. For sparse
   *  sources the global ratio understates the LOCAL ratio within covered
   *  regions: OM is ~28% complete so global ratio = ~0.34, but where OM
   *  has content it's verbose like PM (~1.5-1.8). Using the global ratio
   *  makes per-verse windows too small and content smears into the next
   *  verse. Override to ~1.0-1.5 for fragmentary sources. */
  srcPerCanonOverride: number | null;
}

export const DEFAULT_CURSOR_CONFIG: CursorConfig = {
  windowSlack: 1.5,
  windowMin: 20,
  consumeSlack: 1.10,
  consumeMin: 3,
  highMatchFraction: 1.0,
  tailGapFactor: 0,
  tailTrimMaxMatchFraction: 0.7,
  skipBelowMatchFraction: 0,
  anchorWindowWords: 0,
  anchorLookaheadVerses: 3,
  srcPerCanonOverride: null,
};

export interface SourceAdapter {
  slug: string;
  label: string;
  /** Raw transcript folder (per-page JSON files). */
  raw: string;
  /** Output folder for aligned per-chapter JSON. */
  out: string;
  cursor: CursorConfig;
  /** Optional dictionary for matcher level-4 lookups. */
  dictionary?: Map<string, string>;
}
