// scripts/align2/types.ts

export interface SourceWord {
  /** Normalized form used for matching. */
  norm: string;
  /** Original token from the transcript (used to reconstruct output text). */
  raw: string;
  page: number;
  line: number;
  /** 0-based index of this word within its source line. */
  wordIndexInLine: number;
  source?: string;
}

/** Metadata for one source line, preserved for markdown slicing in segment.ts. */
export interface LineInfo {
  page: number;
  line: number;
  /** Full original text of the line (used to reconstruct output text). */
  text: string;
  /** Full markdown of the line, if different from text. */
  markdown?: string;
  source?: string;
}

export interface TargetWord {
  norm: string;
  book: string;
  chapter: number;
  verse: number;
}

export interface CursorResult extends SourceWord {
  assignedVerse: { book: string; chapter: number; verse: number };
}
