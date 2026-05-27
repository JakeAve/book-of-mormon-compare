---
name: aligning-texts
description: Use when mapping a Book of Mormon text source (Original Manuscript, Printer's Manuscript, 1830, etc.) onto the canonical 2013 book/chapter/verse structure, or when adding a new source-text to the project that doesn't share the 2013 versification.
---

# Aligning Texts (Verse-Level LCS)

## Overview

The alignment pipeline maps a source text to the canonical 2013
`(book, chapter, verse)` triples. Five stages: tokenize → pre-merge
line-break splits → segment by heading → per-verse LCS (or n-gram scaffold)
→ build per-chapter JSON. No LLM calls, no external services. Output mirrors
`data/bom/2013/`: per-chapter JSON files with a `lines` array per verse.

The core idea: instead of one big LCS per chapter, run a small LCS per
canonical verse. Each verse gets a window of ~25–50 source words. This keeps
the next verse's vocabulary out of view and bounds drift to a single verse
before the next iteration recovers.

Each source plugs in via a `SourceAdapter` (in `scripts/align/sources/`) that
supplies its raw/out paths and tunes the cursor. Adapters are
**auto-discovered**: drop a new `<slug>.ts` file with a `SourceAdapter`
default export and it registers itself.

## When to Use

- Tuning alignment quality when a verse boundary looks wrong
- Adding a new source text — write an adapter, drop in fixtures
- Debugging a specific chapter / verse misalignment
- Modifying the matcher, cursor, tail-trim, scaffold, or output builder

## Quick Reference

```bash
deno task align:<slug>                            # align <slug> → data/bom/<slug>/
deno task report:<slug>                           # write per-chapter findings → data/reports/<slug>/
deno run -A scripts/align-source.ts <slug> --dry  # tokenize + align, skip write
deno run -A scripts/align-source.ts <slug> --preview <n>   # log first n verses
deno run -A scripts/align-audit.ts <slug> [<slug2> ...]    # token-purity summary
deno task test                                    # all unit + integration tests
```

## Pipeline Layout

```
scripts/
  align-source.ts          Entry point — resolves adapter by slug, runs pipeline, writes output
  align-report.ts          Per-version misalignment report → data/reports/<slug>/
  align-audit.ts           Token-purity summary across one or more versions
  align/
    types.ts               Shared pipeline types (SourceWord, TargetWord, LineInfo, CursorResult)
    line-key.ts            Stable key construction / parsing
    match.ts               createMatcher(dict?) — tiered fuzzy matcher
    tokenize-source.ts     raw transcript pages → SourceWord[] + LineInfo map
    tokenize-target.ts     2013 canonical → TargetWord[], groupByVerse()
    headings.ts            Chapter / book heading detection + normalization
    segment-source.ts      Splits source at chapter / book headings
    merge-splits.ts        mergeLineBreakSplits() — joins "wher" + "efore" → "wherefore"
    verse-lcs.ts           Per-verse LCS, tail-trim, gap fill
    anchor.ts              findAnchor() — per-segment anchor-window search (used by cursor)
    cursor.ts              runCursor() — orchestrates the per-verse LCS walk
    ngram-anchor.ts        Unique-n-gram + LIS scaffold (used by scaffold-align)
    scaffold-align.ts      runScaffoldAlign() — scaffold algorithm for fragmentary sources
    chapter-markers.ts     Post-pass to relocate stuck chapter-marker lines
    apply-overrides.ts     Per-adapter manual carve-outs
    build-output.ts        CursorResult[] → OutVerse[] (line splits, applyJoins, markdown slicing)
    report.ts              buildChapterReport() — misalignment detection
    sources/
      types.ts             SourceAdapter, CursorConfig, Override, DEFAULT_CURSOR_CONFIG
      index.ts             Auto-discovers adapters, exposes ADAPTERS / getAdapter()
      <slug>.ts            Per-source adapter (default-exported SourceAdapter)
    __tests__/
      integration.test.ts  Per-version golden-file fixtures
      fixtures/expected/<slug>/<book>-<chapter>.json
  shared/
    paths.ts               TARGET_ROOT — canonical target only (adapters own per-source paths)
    bom2013.ts             loadBook(), loadBooks(), BOOK_ORDER, TargetVerse
    stitch.ts              applyJoins(), buildCanonIndex(), decideJoin() — line-stitching
    markdown.ts            buildTextToMdMapping() — text-index → markdown-index mapping
```

## How a Source Word Becomes an OutLine

1. **Tokenize** raw JSON pages into a flat `SourceWord[]` (normalized for
   matching, raw preserved for output). Each word remembers its page, line,
   and word-index-in-line.
2. **Pre-merge line-break splits**: scan adjacent tokens from different lines
   where `norm(A) + norm(B)` is a canonical word and `norm(A)` alone is not.
   Merged tokens go through the LCS as one word; `spanOf` tracks the merge
   so results can be expanded back to original positions.
3. **Segment by heading**: split the source at lines matching chapter / book
   heading patterns. Book headings trigger a canonical-book jump; plain
   chapter headings just create a segment boundary.
4. **Per-verse LCS** (cursor) **or scaffold**: see the two algorithms below.
   Either way the output is a `CursorResult[]` — one entry per source word
   with its assigned canonical verse.
5. **Expand merged tokens** so each original source position has its own
   `CursorResult`. Both fragments share the same verse.
6. **Build per-chapter output** in `build-output.ts`: group by verse, then
   by source line; split lines straddling verses into `a` / `b` suffixed
   ids; call `applyJoins` (from `shared/stitch.ts`) for mid-word line-break
   joins; slice markdown via `buildTextToMdMapping`.

## Two Alignment Algorithms

| Algorithm | When | Implemented in |
|---|---|---|
| `cursor` (default) | Source covers ~all of canon continuously | `cursor.ts` — verse-level LCS with chapter-heading segmentation |
| `scaffold` | Source is fragmentary / jumps around canon | `scaffold-align.ts` + `ngram-anchor.ts` — unique-n-gram anchor pairs + LIS monotonicity + piecewise-linear interpolation |

Select via `algorithm: "scaffold"` on the adapter (default is `"cursor"`).
Both emit the same `CursorResult[]` shape, so downstream stages
(`chapter-markers`, `apply-overrides`, `build-output`) are algorithm-agnostic.

The scaffold algorithm: any n-gram appearing EXACTLY ONCE in both source and
target is an unambiguous match. Collect those, sort by source position, take
an LIS on target position to discard cross-overs, layer multiple n values
for sparse coverage. Piecewise-linear interpolation fills in between
anchors. Verses receiving fewer than `scaffoldMinTokensPerVerse` source
tokens are absorbed into the nearest kept verse.

## The Tiered Matcher (`match.ts`)

`createMatcher(dictionary?)` returns a `Matcher` with `matches(a, b)` and
`matchQuality(a, b)`. Four levels, tried in order:

| Level | Check | Notes |
|-------|-------|-------|
| 1 | `a === b` | exact normalized match |
| 2 | First+last letter + length within ±2 | only fires when both words ≥ 5 chars (short words risk false positives like "him"/"hum") |
| 3 | Levenshtein ≤ threshold (1/2/3 for ≤5/6-9/10+ chars) | only fires when both ≥ 4 chars |
| 4 | Dictionary lookup (scribal → canonical) then re-run levels 1–3 | dict is per-matcher; passed in via the adapter |

`matchQuality(a, b)` returns the level (0 = no match). Both inputs must be
pre-normalized (lowercase, `&` → `and`, punctuation stripped).

No module-level state. Each `runCursor` call creates a fresh matcher with
the adapter's dictionary (or no dictionary if the adapter doesn't supply
one).

## The Cursor (`cursor.ts`)

`runCursor(source, verseGroups, lineInfos, config, dictionary?)` walks the
source segment-by-segment, verse-by-verse.

### Per-verse LCS with suffix-table forward backtracking

For each verse, build the SUFFIX LCS table (`ds[i][j]` = LCS for
`source[i..m-1]` vs `canonical[j..n-1]`). Then walk forward from (0,0),
taking a match only when `ds[fi][fj] === ds[fi+1][fj+1] + 1` (the match is
on an optimal suffix path).

**Why suffix + forward?** Backward backtracking always finds the RIGHTMOST
occurrence of each canonical word in source. When the same phrase appears
in the next verse / chapter, the rightmost match lands in the wrong verse.
Forward backtracking matches each canonical word to the EARLIEST valid
source position.

### Tail-trim (`trimTrailingSparseMatches`)

A second algorithmic pass for sources with textual variants (dropped
clauses). When the source is materially SHORTER than canonical for a verse,
the forward LCS will eagerly extend matches past the natural verse boundary
into the next verse's source — finding common words like `and`, `the`,
`it` there. Result: the cursor over-consumes, drift cascades.

The fix walks the matched-source positions; in the back half of matches,
the first gap larger than `srcPerCanon × tailGapFactor` source positions is
treated as the spurious boundary, and all matches past it are dropped.
Only fires when `matchedCount / verse_words < tailTrimMaxMatchFraction` —
verses with high match coverage are unlikely to have variants worth
trimming.

### Tuning knobs (`CursorConfig`)

All knobs live in `scripts/align/sources/types.ts`. Defaults in
`DEFAULT_CURSOR_CONFIG` are tuned for sources that closely track canon.

| Knob | Default | What it controls |
|---|---|---|
| `windowSlack` | `1.5` | Per-verse window = `verse_words × srcPerCanon × windowSlack`. Larger = more recall, more next-verse bleed. |
| `windowMin` | `20` | Minimum window words. Ensures short verses have enough source to match. |
| `consumeSlack` | `1.10` | Consume cap = `verse_words × srcPerCanon × consumeSlack`. Larger = consume more per verse (risks running out before end of long books). |
| `consumeMin` | `3` | Minimum consume per verse. Prevents stalling on very short verses. |
| `highMatchFraction` | `1.0` | When `matchedCount / verse_words ≥ this`, skip the consume cap and use `lastMatchedSrc + 1` directly. 1.0 = only every canonical word matched. Critical for short heading verses where leading unmatched words push `lastMatchedSrc` just past the cap. |
| `tailGapFactor` | `0` | When > 0, enables tail-trim. Gap threshold = `srcPerCanon × tailGapFactor`. |
| `tailTrimMaxMatchFraction` | `0.7` | Tail-trim only fires when `matchFraction` is below this. Keeps it off for normal high-coverage verses. |
| `skipBelowMatchFraction` | `0` | When > 0, the cursor skips canonical verses whose LCS `matchFraction` is below this without consuming source — corrects for sparse / incomplete sources where many canonical verses have no real source counterpart. |
| `anchorWindowWords` | `0` | When > 0, at the start of each segment, the cursor runs an LCS-based anchor search on this many source words to find the best-matching canonical verse-group and jump there. Needed for sources whose surviving fragments don't start at canonical 1:1. |
| `anchorLookaheadVerses` | `3` | Verse-groups combined into each anchor candidate window. `1` = match per verse (precise but can lose ties); larger values increase recall but blur the anchor position. |
| `srcPerCanonOverride` | `null` | Forces a specific source-words-per-canonical-word ratio instead of the runtime-computed global ratio. Set for sparse sources whose global ratio understates the LOCAL ratio within covered regions. |

`srcPerCanon` is computed at runtime as `source.length / totalCanonWords`.

### Segment-boundary handling

When the LCS finds zero matches for a verse AND we're near the end of a
segment (less than half of `expectedConsume` source words remain), exit the
segment loop without advancing `vgIdx`. The verse's actual content is
likely in the next segment (e.g. a "Chapter N" heading split it across),
and the trailing fill at the end of `runCursor` will assign the residual
source words to the previous verse.

### Book-heading jumps

When entering a segment whose heading text matches a book name
(`headingToBook` returns non-null), the cursor JUMPS `vgIdx` forward to the
first verse group of that canonical book. This corrects any drift
accumulated in the previous segment. Adding a new book-heading pattern
requires updating BOTH `isChapterHeading` AND `headingToBook` in
`headings.ts`.

### Line-break split merging

Manuscript line breaks sometimes fall mid-word. `mergeLineBreakSplits`
detects these via:

```
w.line !== next.line                            // different lines
&& canonNorms.has(w.norm + next.norm)           // joined form is canonical
&& !canonNorms.has(w.norm)                      // first fragment alone isn't
```

Merged tokens go through the LCS as a single word. The `spanOf` array
tracks which positions were merged so the result can be expanded back to
original source indices after verse assignment. **Both fragments get the
same verse**, and `applyJoins` in `build-output.ts` removes the trailing
space between them visually.

## Per-Source Adapters (`sources/`)

Each source plugs in via a `SourceAdapter`:

```ts
interface SourceAdapter {
  slug: string;                       // "pm", "1830", ...
  label: string;                      // "Printer's Manuscript"
  raw: string;                        // "data/raw/<slug>"
  out: string;                        // "data/bom/<slug>"
  algorithm?: "cursor" | "scaffold";  // default "cursor"
  cursor: CursorConfig;               // tuning knobs (see table above)
  dictionary?: Map<string, string>;   // optional level-4 dictionary
  scaffoldMinTokensPerVerse?: number; // only when algorithm: "scaffold"
  overrides?: Override[];             // per-verse manual carve-outs
}
```

`scripts/align/sources/index.ts` auto-discovers every `*.ts` file in its
directory (except `index.ts`, `types.ts`, and `*.test.ts`) and expects each
to default-export a `SourceAdapter`. Duplicate slugs or invalid exports
throw at module load. `align-source.ts` reads the slug from `argv[0]` and
`getAdapter(slug)` resolves it.

> Filenames must be valid TS identifiers when imported by name elsewhere,
> but here they're only loaded via dynamic import. A digit-leading name
> like `1830.ts` works for auto-discovery.

### On-Disk Layout

| Path | Contents |
|---|---|
| `data/bom/2013/<book>/<ch>.json` | canonical target |
| `data/raw/<slug>/<page>.json` | raw transcript page (one file per source page, numbered: `1.json`, `2.json`, …) — commit alongside the adapter |
| `data/bom/<slug>/<book>/<ch>.json` | aligned per-chapter output (the diff UI consumes this — commit it too; regenerated by `align:<slug>`) |

Raw-page JSON is an array, one entry per line:

```jsonc
[
  {
    "text":     "The Book of Mormon—— An account written by the hand",
    "markdown": "The Book of Mormon—— An account written by the hand", // optional; omit if no scribal markup
    "chapter":  1,           // PAGE number — NOT canonical chapter
    "verse":    1,           // LINE-on-page — NOT canonical verse
    "source":   "https://..."// optional per-line URL
  }
]
```

`chapter` / `verse` carry page / line metadata, an artifact of the JS Papers
shape — not actual versification. Both flow through to the output's `page`
and `line` fields unchanged.

**Book slugs** are enumerated in `BOOK_ORDER` (`scripts/shared/bom2013.ts`) —
kebab-case (`1-ne`, `2-ne`, `w-of-m`, `3-ne`, `morm`, `moro`, `witnesses`,
…). Use the same slug in `overrides[].target.book` and fixture filenames.

## Adding a New Source

1. Drop raw transcript files into `data/raw/<slug>/<page>.json` (shape
   above). One file per source page.
2. Create `scripts/align/sources/<slug>.ts` with a default-exported
   `SourceAdapter` — minimal form:

   ```ts
   import { DEFAULT_CURSOR_CONFIG, type SourceAdapter } from "./types.ts";

   const adapter: SourceAdapter = {
     slug: "<slug>",
     label: "<Human Readable Name>",
     raw: "data/raw/<slug>",
     out: "data/bom/<slug>",
     cursor: DEFAULT_CURSOR_CONFIG,
   };

   export default adapter;
   ```

   No edits to `sources/index.ts` — the adapter auto-registers. A
   duplicate-slug or missing-default-export error throws at script startup
   with the offending filename.
3. Add deno tasks in `deno.json`:
   `"align:<slug>": "deno run -A scripts/align-source.ts <slug>"` and
   `"report:<slug>": "deno run -A scripts/align-report.ts <slug>"`.
4. Register the slug's human-readable name. The DIFF UI auto-discovers
   any version present under `data/bom/<slug>/`, but the dropdown label
   comes from `lib/data.ts` — add the slug to BOTH `VERSION_DISPLAY_NAMES`
   (long form, e.g. `"1830 First Edition"`) and `VERSION_SHORT_NAMES`
   (short form for tight UI, often the same string for editions). Both
   are `Record<string, string>` keyed by slug.
5. Run `deno task align:<slug>` then `deno task report:<slug>` (or
   `deno run -A scripts/align-audit.ts <slug>` for token-purity). Inspect
   `data/reports/<slug>/summary.json` for the top-flagged chapters.
6. If the source has dropped clauses / variants, enable `tailGapFactor` in
   the adapter and tune against the report.
7. For fragmentary sources where source pages jump around canonical text,
   set `algorithm: "scaffold"`. The pipeline default for
   `scaffoldMinTokensPerVerse` is `3`; lower it only if you see whole
   verses being absorbed into neighbors that have surviving content.
8. Add fixtures to `scripts/align/__tests__/fixtures/expected/<slug>/`
   named `<book>-<chapter>.json` (e.g. `1-ne-3.json`). Pick 2–3
   chapters: at least one top-flagged from the report (to lock the fix
   in) and at least one routine chapter (regression baseline). Add a
   `VersionSuite` entry in `integration.test.ts`:

   ```ts
   { adapter: getAdapter("<slug>")!, chapters: [
     { slug: "<slug>/<book>-<n>", book: "<book>", chapter: <n> },
   ]},
   ```
9. As you inspect output, add `overrides` entries for stubborn one-off
   cases the algorithm can't handle (see Overrides section).

## Adding Dictionary Entries

A `Matcher`'s level 4 dictionary is per-adapter and starts empty. Only add
entries that:

- Don't already match at levels 1–3 (check with `matchQuality()`)
- Map a scribal form to a canonical form
- Are causing actual misalignment per the report

Most words match at level 2 or 3 already. Don't pre-populate with
English-spelling-variant pairs.

## Overrides

Per-adapter explicit reassignments for cases the general algorithm gets
wrong. Applied as a post-pass after `pushChapterMarkersForward`. Each
override targets a specific source line (`page`, `line`) and reassigns its
words to a canonical verse. Lives on the adapter:

```ts
overrides: [
  {
    page: 196,
    line: 30,
    // wordIndices?: number[]      — specific 0-based indices, or
    // wordRange?:   [start, end]  — 0-based inclusive range, or
    // omit both                   — entire line
    target: { book: "hel", chapter: 2, verse: 8 },
    note: "why this override is needed (required)",
  },
],
```

`apply-overrides.ts` finds matching source words by
`(page, line, wordIndexInLine)` and reassigns them. If an override doesn't
match any source words, a warning prints — alignment changes may have made
the override obsolete; check whether it can be deleted.

### When to add an override vs extend the algorithm

Use an **override** when:

- The scribe added filler / connectives that don't appear in either
  neighboring canonical verse (no structural rule can place them).
- It's a one- or two-verse quirk unique to this edition.

Use an **algorithm change** when:

- The same pattern recurs across many verses.
- The pattern is universal enough to express as a rule without enumeration.

Keep overrides sparse — every entry is a known limitation of the algorithm
we've accepted rather than fixed. Record a `note` so future readers know
what motivated the carve-out.

## Diagnosing Misalignment

When a verse looks wrong, follow this sequence:

1. **Look at the raw source line(s)** for the boundary. Is the canonical
   verse split across multiple source lines? Are there scribal-deletion or
   editorial-markup tokens (`~~struck~~`, `{{shaded}}`, `[inserted]`)?
2. **Compare canonical N and N+1** side-by-side. Do they share opening
   phrases? That's the class of issues forward-suffix-LCS handles correctly
   — verify the cursor is finding the EARLIEST match.
3. **Check the merge**: does a line-break-split need to be in the
   canonical norm set?
4. **Check matchedCount**: if the LCS matched fewer canonical words than
   exist in the verse, the cap will kick in. That's fine for verses where
   the cap should fire; it's bad for short heading verses where leading
   unmatched words push `lastMatchedSrc` past the cap.
5. **Check for a textual variant**. If the source is missing ~30+ words
   from the canonical verse, tail-trim should fire — but only if
   `matchFraction < tailTrimMaxMatchFraction`.
6. **Read the report JSON**: `data/reports/<slug>/<book>/<ch>.json` shows
   per-verse findings with type (`leading-bleed`, `trailing-bleed`,
   `chapter-bleed`, `major-misalignment`, `split-word-bleed`).

## Common Pitfalls

- **Tightening `consumeSlack` reduces leading-bleed but can exhaust source
  before the end of long books.** Prefer `highMatchFraction = 1.0` bypass
  for precision without forcing the cap loose globally.
- **Lowering `tailGapFactor` too far over-trims legitimate matches**,
  causing the cursor to under-consume and leading-bleed everywhere. Aim
  for a factor that catches genuine missing-clause gaps but not typical
  noise gaps.
- **Adding a book-heading pattern requires updating BOTH `isChapterHeading`
  AND `headingToBook`** in `headings.ts`. Inconsistent updates → segment
  boundaries with no book jump.
- **The aligner wipes the output tree before rewriting.** Don't hand-edit
  files under `data/bom/<slug>/` — edit the raw transcript, the adapter,
  or the aligner.
- **Backward LCS backtracking is wrong for this use case** — it finds the
  rightmost match, which is wrong when the same phrase repeats in the next
  chapter. The implementation uses the suffix table + forward backtracking.
- **Forward backtracking on the PREFIX DP doesn't work** — at (0,0) when
  all dp values are 0, the algorithm can't decide which direction to
  advance and gets stuck advancing canonical without taking matches.
  Always use the suffix table.

## Testing

- **Unit tests** (`*.test.ts` next to each module): match, tokenize,
  cursor, build-output, report, stitch, markdown.
- **Integration tests** (`__tests__/integration.test.ts`): per-version
  `VersionSuite` entries with golden-file fixtures lock the
  end-to-end output of representative chapters.
- **Token-purity audit** (`scripts/align-audit.ts`) is the most reliable
  quality signal — fraction of source tokens whose assigned canonical
  verse actually contains those tokens. Run it after any cursor / scaffold
  / matcher change.

When you change the cursor / matcher / adapter tuning, regenerate the
fixtures for affected chapters:

```bash
deno task align:<slug>
# Replace the affected fixture(s)
jq '[.[] | select(.book == "<book>" and .chapter == <n>)]' \
   data/bom/<slug>/<book>/<n>.json \
   > scripts/align/__tests__/fixtures/expected/<slug>/<book>-<n>.json
deno task test
```

## What NOT to Do

- **Don't add an LLM cleanup pass.** This pipeline is deliberately LLM-free.
- **Don't reintroduce a chapter-level LCS or tail anchor.** With
  verse-level granularity, the whole verse IS the boundary unit.
- **Don't add per-chapter `srcPerCanon` overrides.** The global ratio +
  `highMatchFraction = 1.0` bypass handles per-chapter variation naturally.
- **Don't widen `windowSlack` past ~2.0.** Larger windows reintroduce
  chapter-level vocabulary-bleed problems.
- **Don't enable tail-trim globally.** It exists for sources with dropped
  clauses. For sources where source ≥ canonical, tail-trim risks cutting
  legit matches.
- **Don't introduce module-level mutable state in `match.ts`.** The
  matcher is a factory function so each `runCursor` call gets its own
  dictionary scope.
- **Don't duplicate the source registry.** Adapters live in
  `scripts/align/sources/<slug>.ts` and are auto-discovered. Nothing else
  should maintain a parallel list of slugs / paths.
