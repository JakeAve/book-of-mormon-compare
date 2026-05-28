// Canonical target the aligner aligns every source against.
//
//   data/raw/<slug>/*.json            raw JS Papers transcripts (one file per
//                                     manuscript page, entries keyed by line)
//   data/bom/<slug>/<book>/<ch>.json  aligned per-chapter output (consumed by
//                                     loadChapter)
//
// Per-source slug/label/raw/out lives on each SourceAdapter in
// `scripts/align/sources/*.ts` — the adapters are auto-discovered by
// `scripts/align/sources/index.ts`, so this file intentionally does NOT
// duplicate that registry.

export const TARGET_ROOT = "data/bom/2013";
