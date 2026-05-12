---
name: aligning-texts
description: Use when mapping a Book of Mormon text source (Original Manuscript, Printer's Manuscript, 1830, etc.) onto the canonical 2013 book/chapter/verse structure, or when adding a new source-text to the project that doesn't share the 2013 versification.
---

# Aligning Texts to Canonical 2013 Structure

## Overview

`scripts/align/` is a small framework that maps a "source" text (with its own divisions, or none) onto the canonical 2013 `(book, chapter, verse)` triples. It uses unique-n-gram anchor matching plus monotone interpolation — no LLM calls, no external services.

Output mirrors `data/bom/2013/`: per-chapter JSON files under `data/bom/<name>-aligned/`. Each verse entry carries a `lines` array of source fragment **slices** — when a source line spans verses 12 and 13, it appears in both files, each carrying its own portion of the line's text plus a copy of the metadata (`id`, `page`, `line`, `source`).

## When to Use

- Adding a new source text (e.g. Printer's Manuscript, 1830 edition) and wanting it in the same per-chapter file layout the UI already consumes
- Re-running the OM alignment after the upstream JSON gains new content or gets re-extracted line-by-line
- Tuning alignment quality when coverage looks wrong for a specific book/chapter

## Quick Reference

| Task | Command |
|------|---------|
| Re-align Original Manuscript → `data/bom/om/` | `deno task align:om` |
| Re-align Printer's Manuscript → `data/bom/pm/` | `deno task align:pm` |
| Preview without writing | `deno run -A scripts/align-source.ts om --preview 20 --dry` |

The deno tasks call `scripts/align-source.ts <slug>`, which reads the source registry in `scripts/align/paths.ts`. Flags: `--preview N`, `--dry`.

## Framework Layout

```
scripts/
  align/
    types.ts            SourceFragment, TargetVerse, AlignedFragment, VerseSegment
    normalize.ts        case/punct/&/spelling normalization + tokenStream()
    anchor.ts           unique-n-gram anchors + LIS pruning
    align.ts            align(fragments, verses, opts) → AlignResult
                        Each AlignedFragment carries `segments[]` — the
                        verse(s) it covers and the local token range for each.
    bucket.ts           bucketByVerse() — only needed if you want the older
                        "whole-line in every overlapping verse" shape; the
                        segment-based writer below does not use it.
    paths.ts            SOURCES registry — slug → { raw, out, label }
    sources/
      om.ts             loadOM(root, { pageRange }) — works for any
                        JS-Papers-style transcript (OM and PM share the shape)
      bom2013.ts        loadBook / loadBooks (canonical sequence)
  align-source.ts       generic entry — `<slug> [--preview N] [--dry]`,
                        slices each line by segment and writes the chapter tree
```

## On-Disk Layout

| Path | Contents |
|------|----------|
| `data/bom/2013/<book>/<ch>.json` | canonical target |
| `data/raw/<slug>/*.json` | raw transcript pages, one file per JS Papers page (kept outside `data/bom/` so the BoM tree only contains UI-consumable artifacts) |
| `data/bom/<slug>/<book>/<ch>.json` | aligned per-chapter output (the diff UI consumes this) |

Currently registered slugs: `om`, `pm`.

## How a Source Line Becomes a Sliced VerseLine

1. `align()` returns an `AlignedFragment` per source line, with `segments: VerseSegment[]`. Each segment is `{ verse: {book, chapter, verse}, tokenStart, tokenEnd }` over the line's own (0-based) normalized token indices.
2. The writer splits the line's raw `text` on whitespace into words, then slices `words[tokenStart..tokenEnd]` per segment.
3. Each slice is emitted as an `OutLine { id, page, line, text, source }` inside the verse bucket for that segment. A line that crosses verse 4→5 emits two `OutLine`s with the same `id`/`page`/`line` and different `text`.

## Adding a New Source

1. **Drop the raw transcript files** into `data/raw/<slug>/*.json`. If the transcript matches the JS Papers shape (`[{ text, markdown?, chapter, verse, source }]` per page), no loader changes needed — `sources/om.ts` already handles it. If it's a different shape, write a new loader in `scripts/align/sources/<slug>.ts` returning `SourceFragment[]` with `{ id, text, meta? }`.
2. **Register the slug** in `scripts/align/paths.ts` `SOURCES` with `{ slug, label, raw, out }`. The `as const satisfies` keeps the registry strongly typed.
3. **Add a deno task** in `deno.json`:
   ```json
   "align:<slug>": "deno run -A scripts/align-source.ts <slug>"
   ```
4. **Add spelling-variants** in `normalize.ts` if the source has its own scribal/typesetting quirks that defeat anchor matching. Only add fixes you can verify help — generic English spelling tweaks aren't worth it.
5. **Add a display name** in `lib/data.ts` `VERSION_DISPLAY_NAMES` so the UI shows the source friendlier than the slug.
6. **Run `deno task align:<slug>`** and check the coverage report. If a book you expect to be present shows 0%, suspect: missing source files, a bad page filter, or normalization eating too much.

If the source isn't page/line-structured (e.g. it's a printed edition with its own chapter:verse numbering), point `loadOM` at it anyway — it just needs `chapter`/`verse` integers in the entries to build stable IDs. The aligner is text-agnostic; it doesn't care what those integers mean.

## Tunables (`AlignOptions`)

| Option | Default | What it controls |
|--------|---------|------------------|
| `ngrams` | `[6, 4, 3]` | n-gram sizes tried for anchor matching. Smaller = more anchors but more noise. Drop `3` for stricter alignment. |
| `verseSlack` | `2` | How many verses beyond a fragment's anchored extremes interpolation may reach. Raise for very long fragments; lower if you see drift across lacunae. |
| `maxSpanRatio` | `4` | Max (target-token span / source-token count) per fragment. Anchors outside this distance from the median are dropped as stray matches. |
| `spelling` | `true` | Apply spelling-fix regexes from `normalize.ts`. |

## How Alignment Works (Mental Model)

1. Normalize both texts to lowercase ASCII words, `&` → `and`, drop OM editorial markup (`~~strike~~`, `{{braces}}`, `[brackets]`).
2. Build a token stream from each side; each token remembers its owning fragment / verse.
3. For each n in `ngrams` (largest first), find n-grams that occur exactly once in both streams. Those are anchor pairs.
4. Patience-LIS the anchors on the target coordinate → strictly monotone anchor set.
5. Drop in-fragment outlier anchors (`maxSpanRatio` filter).
6. Per fragment: build a verse range from interpolated token positions, clamped to anchor extremes ± `verseSlack`. Fragments with zero anchors get filled in from neighbors (low-confidence, `matchedTokens=0`).
7. Per fragment: walk its tokens, assign each to a canonical verse (forward-fill unmapped tokens from neighbors, enforce monotonicity), then group consecutive same-verse tokens into `segments[]`. This is what lets the writer slice line text at the canonical verse boundary.

## Consuming the Output (Diff UI)

`lib/data.ts` knows the aligned shape. `loadChapter(version, book, chapter)` returns `Verse[]` for any version. When the underlying JSON has the `lines` field, the loader:

- Stitches `lines[*].text` with a single space (`stitchLines` in `lib/data.ts`) into the flat `verse.text` the diff component needs.
- Preserves the originals on `verse.lines: VerseLine[]` for any future line-level UI (per-line source links, expandable provenance, etc.).
- Surfaces the first line's `source` as `verse.source` so the verse number remains clickable.

The diff component (`components/Diff.tsx`) is unchanged — it only reads `verse.text` / `verse.markdown` / `verse.source`.

## Expected Coverage (sanity values)

**Original Manuscript** (`deno task align:om`)
- `1-ne` ~89%, `alma` ~64%, `jacob` ~29%, `2-ne` ~18%, `ether` ~16%
- `jarom`/`omni`/`w-of-m`/`mosiah`/`4-ne`/`morm`/`moro` correctly **0%** — well-known OM lacunae
- Isaiah chapters (`2-ne 11-22`) low because wording diverges enough to defeat anchor matching

**Printer's Manuscript** (`deno task align:pm`)
- Should be 80–97% on every book. PM is largely intact, so partial books are signals of a problem.
- First run gave: 1-ne 97%, 2-ne 86%, alma 95%, hel 97%, ether 92%, moro 77% — use as a rough yardstick.

If a book that *should* have content shows 0%, suspect: missing source files, a bad page filter in the loader, or normalization eating too much (add or remove a spelling rule).

## Common Pitfalls

- **OM pages 77+ are whole-page fragments**, not line-by-line. Coverage there is page-level, not line-level — that's a property of the upstream JSON, not the aligner. Segment-splitting still produces useful slices, but the unit is "page chunk" instead of "manuscript line." Re-extracting line-by-line will improve granularity automatically.
- **`deno task align:<slug>` wipes the output tree** before rewriting (`rm -rf` on `cfg.out`). Don't hand-edit files under `data/bom/om/` or `data/bom/pm/` — they'll be blown away on the next run. Edit the raw transcript or the aligner instead.
- **Mid-word scribal breaks become visible** when a verse boundary lands at the break. Example: `1 Ne 2:4` ends with `"into the wildern"` and `2:5` begins with `"ess"` because "wilderness" straddles the canonical boundary. The stitch always inserts a space, so the rendered verse text shows `"wildern ess"`. Living with this is the cost of taking verse boundaries literally; a dictionary/bigram pass could heal it later.
- **`verseSlack` too high** brings the lacuna bug back. If `jarom`/`omni`/`w-of-m` start showing nonzero coverage, that's the signal — knock it back down.
- **Don't re-Read the alignment after editing the aligner** — re-run `write-om-aligned.ts` instead. It rebuilds the tree from scratch (`rm -rf` on the output root).
- **Word index ≈ normalized-token index, not exactly.** The writer slices the raw text by whitespace-word index using the segment's normalized-token range. They diverge when a normalization rule changes word count (e.g. `in heritance` → `inheritance` collapses two words into one). Off-by-one slice boundaries are possible but rare in practice; if a source has many such rules, audit the slicing on representative verses.

## Skipping the LLM Path

This framework is deliberately LLM-free. If anchor matching can't resolve a stretch (e.g. heavy paraphrase), the affected fragments end up with `matchedTokens=0` rather than confidently-wrong placements. That makes a small Haiku cleanup pass straightforward to bolt on later — feed only the unanchored fragments and their neighbor context.
