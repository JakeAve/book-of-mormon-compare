// Per-source configuration. Each manuscript / edition aligned by the aligner plugs
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

/** A per-adapter override of the algorithm's verse assignment. Use for cases
 *  the general algorithm can't handle (e.g. source-specific filler phrases
 *  that don't appear in either canonical verse, so no structural rule can
 *  decide where to put them). Keep overrides sparse — every entry is a
 *  known limitation of the algorithm we've accepted rather than fixed.
 *  Record a `note` so future readers know what motivated the carve-out.
 *
 *  Two kinds:
 *  - Word reassignment (page + line present): moves source words to a
 *    different verse than the cursor assigned them to.
 *  - Text insertion (insertText present, no page/line): injects text that
 *    does not exist in the raw source — e.g. a caret insertion in the
 *    manuscript that the JSP transcript did not capture. */
export interface Override {
  // ── Word-reassignment fields (required for reassignment overrides) ──────
  /** Source page (= raw `chapter`). Omit for insertion overrides. */
  page?: number;
  /** Source line (= raw `verse`). Omit for insertion overrides. */
  line?: number;
  /** Word indices on the line to reassign. Omit to reassign the whole line.
   *  Indices are 0-based and match `SourceWord.wordIndexInLine`. */
  wordIndices?: number[];
  /** Inclusive range [start, end] of word indices to reassign. */
  wordRange?: [number, number];

  // ── Text-insertion fields (required for insertion overrides) ─────────────
  /** Text to inject into the target verse. When present this is an insertion
   *  override — page/line/wordIndices/wordRange are ignored. */
  insertText?: string;
  /** Markdown version of the inserted text (e.g. with deletion markup).
   *  Defaults to insertText if omitted. */
  insertMarkdown?: string;
  /** Insert the synthetic line immediately after this existing line in the
   *  target verse. Defaults to appending at the end of the verse. */
  insertAfterLine?: { page: number; line: number };
  /** When set alongside insertAfterLine, splits that line at this 0-based
   *  word index (inclusive end of the first half) and inserts the synthetic
   *  line between the two halves. */
  insertAfterWordIndex?: number;

  // ── Common fields ────────────────────────────────────────────────────────
  /** Canonical destination. */
  target: { book: string; chapter: number; verse: number };
  /** Why this override exists. Required for non-obvious corrections. */
  note: string;
}

export interface SourceAdapter {
  slug: string;
  label: string;
  raw: string;
  out: string;
  /** Which alignment algorithm to use. "cursor" (default) is the verse-level
   *  LCS for sources that cover canon continuously. "scaffold" is the
   *  unique-n-gram anchor algorithm for fragmentary sources (OM). */
  algorithm?: "cursor" | "scaffold";
  cursor: CursorConfig;
  dictionary?: Map<string, string>;
  /** Minimum source tokens that must map to a canonical verse for the
   *  scaffold algorithm to emit it. Only applies when algorithm = "scaffold". */
  scaffoldMinTokensPerVerse?: number;
  /** Per-adapter overrides for cases the general algorithm gets wrong. */
  overrides?: Override[];
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
