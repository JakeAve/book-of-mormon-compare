// Path conventions for aligning text sources onto the canonical 2013 layout.
//
//   data/raw/<slug>/*.json            raw JS Papers transcripts (one file per
//                                     manuscript page, entries keyed by line)
//   data/bom/<slug>/<book>/<ch>.json  aligned per-chapter output (consumed by
//                                     loadChapter)
//
// Raw transcripts live outside data/bom/ so the BoM data tree only contains
// publishable, UI-consumable artifacts. To add a new source, register its slug
// here and run `deno task align:<slug>`.

export const TARGET_ROOT = "data/bom/2013";

export interface SourceConfig {
  /** Short slug used in folder names and deno task names. */
  slug: string;
  /** Display name for logs. Distinct from VERSION_DISPLAY_NAMES in lib/data.ts
   * (that one feeds the UI; this one just labels CLI output). */
  label: string;
  /** Folder holding the raw transcript page files. */
  raw: string;
  /** Folder the aligned per-chapter tree gets written to. */
  out: string;
}

export const SOURCES = {
  om: {
    slug: "om",
    label: "Original Manuscript",
    raw: "data/raw/om",
    out: "data/bom/om",
  },
  pm: {
    slug: "pm",
    label: "Printer's Manuscript",
    raw: "data/raw/pm",
    out: "data/bom/pm",
  },
} as const satisfies Record<string, SourceConfig>;

export type SourceSlug = keyof typeof SOURCES;

export function isSourceSlug(s: string): s is SourceSlug {
  return s in SOURCES;
}
