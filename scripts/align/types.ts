// Generic alignment types. A "source" is the text whose verse divisions you
// don't trust (e.g. the Original Manuscript). A "target" is the text with the
// canonical chapter/verse system you want to map onto (e.g. the 2013 edition).

export interface SourceFragment {
  /** Stable id for this fragment (e.g. `${page}:${line}`). */
  id: string;
  /** Plain text of the fragment. */
  text: string;
  /** Any extra metadata you want preserved on the output. */
  meta?: Record<string, unknown>;
}

export interface TargetVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface AlignedFragment {
  id: string;
  /** First canonical verse this fragment touches. */
  start: { book: string; chapter: number; verse: number };
  /** Last canonical verse this fragment touches (inclusive). */
  end: { book: string; chapter: number; verse: number };
  /** Number of source tokens that matched a target token via the anchor set. */
  matchedTokens: number;
  /** Total normalized tokens in the fragment. */
  totalTokens: number;
  /** For fragments that cross verse boundaries: where each canonical verse
   * begins and ends within the fragment's normalized token sequence. Token
   * indices are 0-based within this fragment. Always at least one entry. */
  segments: VerseSegment[];
  meta?: Record<string, unknown>;
}

export interface VerseSegment {
  verse: { book: string; chapter: number; verse: number };
  /** Inclusive start token index within the fragment. */
  tokenStart: number;
  /** Exclusive end token index within the fragment. */
  tokenEnd: number;
}

export interface Token {
  /** Normalized form (lowercased, punctuation-stripped, &→and, etc.). */
  norm: string;
  /** Index of the owning fragment / verse in the parent array. */
  ownerIdx: number;
}
