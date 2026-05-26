---
name: aligning-texts
description: Use when mapping a Book of Mormon text source (Original Manuscript, Printer's Manuscript, 1830, etc.) onto the canonical 2013 book/chapter/verse structure, or when adding a new source-text to the project that doesn't share the 2013 versification.
---

# Aligning Texts (Verse-Level LCS)

## Overview

The alignment pipeline maps a source text (Printer's Manuscript, 1830 First
Edition, etc.) to the canonical 2013 `(book, chapter, verse)` triples. It's a
five-stage pipeline: tokenize → pre-merge line-break splits → segment by
heading → per-verse LCS → build per-chapter JSON. No LLM calls, no external
services. Output mirrors `data/bom/2013/`: per-chapter JSON files with a
`lines` array per verse.

The core idea: instead of one big LCS per chapter, run a small LCS per
canonical verse. Each verse gets a window of ~25–50 source words. This keeps
the next verse's vocabulary out of view and bounds drift to a single verse
before the next iteration recovers.

Each source (PM, 1830, OM, 1837) plugs in via a `SourceAdapter` that supplies
its raw/out paths and tunes the cursor. PM uses default tuning; 1830 enables
tail-trim to handle textual variants where clauses were dropped.

## When to Use

- Tuning alignment quality when a verse boundary looks wrong
- Adding a new source text — write an adapter, drop in fixtures
- Debugging a specific chapter / verse misalignment reported by the report tool
- Modifying the matcher, cursor, tail-trim, or output builder

## Quick Reference

```bash
deno task align:pm          # align PM → data/bom/pm/
deno task align:1830        # align 1830 → data/bom/1830/
deno task align:om          # align OM → data/bom/om/
deno task align:1837        # align 1837 → data/bom/1837/
deno task test              # all unit + integration tests
deno run -A scripts/align-report.ts <version>   # report findings vs canon
```

Full alignment takes ~7s per source. Test suite ~18s.

## Pipeline Layout

```
scripts/
  align-source.ts          Entry point — resolves adapter by slug, runs pipeline, writes output
  align/
    types.ts               SourceWord, TargetWord, LineInfo, CursorResult
    line-key.ts            lineKey(), parseLineKey(), verseKey() — stable key construction/parsing
    match.ts               createMatcher(dict?) — tiered fuzzy matcher (4 levels)
    tokenize-source.ts     raw transcript pages → SourceWord[] + LineInfo map
    tokenize-target.ts     2013 canonical → TargetWord[], groupByVerse()
    headings.ts            isChapterHeading(), headingToBook() — heading detection
    segment-source.ts      segmentSource() — splits source at chapter/book headings
    merge-splits.ts        mergeLineBreakSplits() — "wher"+"efore" → "wherefore"
    verse-lcs.ts           verseLCS(), trimTrailingSparseMatches(), fillGapsInPlace()
    cursor.ts              runCursor() — orchestrates the per-verse LCS walk
    ngram-anchor.ts        buildAnchorsMulti(), interpolateScaffold() — unique-n-gram + LIS scaffold
    scaffold-align.ts      runScaffoldAlign() — scaffold-based algorithm for fragmentary sources
    chapter-markers.ts     pushChapterMarkersForward() — post-pass for stuck chapter markers
    apply-overrides.ts     applyOverrides() — per-adapter manual carve-outs
    build-output.ts        buildAllVerseOutputs() — CursorResult[] → OutVerse[] (line splits, applyJoins, markdown slicing)
    report.ts              buildChapterReport() — misalignment detection (used by align-report.ts)
    sources/
      types.ts             SourceAdapter, CursorConfig, Override, DEFAULT_CURSOR_CONFIG
      pm.ts                PM adapter (default tuning)
      om.ts                OM adapter (scaffold algorithm, overrides list)
      _1830.ts             1830 adapter (tail-trim enabled)
      _1837.ts             1837 adapter
      index.ts             ADAPTERS registry, getAdapter()
    __tests__/
      integration.test.ts  Per-version golden-file fixtures
      fixtures/expected/
        pm/                1-ne-3.json, 1-ne-11.json, mosiah-23.json
        1830/              1-ne-3.json, alma-32.json, alma-50.json
  shared/
    paths.ts               TARGET_ROOT, SOURCES, isSourceSlug — shared path constants
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
   "wher" + "efore" → "wherefore" gets emitted as a single source token before
   the LCS runs. Tracked via a `spanOf: Uint8Array` so the result can be
   expanded back to original positions afterwards.
3. **Segment by heading**: split the source at lines that match chapter/book
   heading patterns (`Chapter II`, `THE BOOK OF JACOB`). The book heading
   determines the canonical book the cursor jumps into; plain chapter headings
   only create a segment boundary.
4. **Per-verse LCS** (the cursor): iterate `verseGroups` sequentially. For
   each verse, take a small window of source words ahead of the current
   `srcOffset`, run a suffix-LCS forward backtracking, optionally tail-trim
   spurious matches, and consume up to the last matched source position.
   Move to the next verse.
5. **Expand merged tokens**: a merged source token (`spanOf[i] = 2`) gets
   emitted as TWO `CursorResult` entries — one for each original source
   fragment — both assigned to the same verse.
6. **Build per-chapter output** in `build-output.ts`: group `CursorResult[]`
   by verse, then by source line. Split lines that span verses into `a`/`b`
   segments with suffix IDs (`"8:25a"`, `"8:25b"`). Call `applyJoins` (from
   `shared/stitch.ts`) to handle mid-word line-break joins. Slice markdown
   using `buildTextToMdMapping` from `shared/markdown.ts`.

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

No module-level state. Each `runCursor` call creates a fresh matcher with the
adapter's dictionary (or no dictionary if the adapter doesn't supply one).

## The Cursor (`cursor.ts`)

`runCursor(source, verseGroups, lineInfos, config, dictionary?)` takes a
`CursorConfig` and walks the source segment-by-segment, verse-by-verse.

### Per-verse LCS with suffix-table forward backtracking

For each verse, build the SUFFIX LCS table (`ds[i][j]` = LCS for
`source[i..m-1]` vs `canonical[j..n-1]`). Then walk forward from (0,0),
taking a match only when `ds[fi][fj] === ds[fi+1][fj+1] + 1` (the match is on
an optimal suffix path).

**Why suffix + forward?** Backward backtracking always finds the RIGHTMOST
occurrence of each canonical word in source. When the same phrase appears in
the next verse/chapter (e.g. "our father" in canonical 4:38 AND 5:1), the
rightmost match lands in the wrong verse. Forward backtracking matches each
canonical word to the EARLIEST valid source position.

### Tail-trim (`trimTrailingSparseMatches`)

A second algorithmic pass for sources with textual variants (1830 dropped
clauses). When the source is materially SHORTER than canonical for a verse,
the forward LCS will eagerly extend matches past the natural verse boundary
into the next verse's source — finding common words like `and`, `the`, `it`
there. Result: the cursor over-consumes, drift cascades.

The fix walks the matched-source positions; in the back half of matches, the
first gap larger than `srcPerCanon × tailGapFactor` source positions is
treated as the spurious boundary, and all matches past it are dropped. Only
fires when `matchedCount / verse_words < tailTrimMaxMatchFraction` — verses
with high match coverage are unlikely to have variants worth trimming.

PM has `tailGapFactor: 0` (off). 1830 has `tailGapFactor: 8`,
`tailTrimMaxMatchFraction: 0.7`.

### Tuning knobs (`CursorConfig`)

All knobs live in `scripts/align/sources/types.ts`. Defaults in
`DEFAULT_CURSOR_CONFIG` are PM-tuned.

| Knob | Default | What it controls |
|---|---|---|
| `windowSlack` | `1.5` | Per-verse window = `verse_words × srcPerCanon × windowSlack`. Larger = more recall, more next-verse bleed. |
| `windowMin` | `20` | Minimum window words. Ensures short verses have enough source to match. |
| `consumeSlack` | `1.10` | Consume cap = `verse_words × srcPerCanon × consumeSlack`. Larger = consume more per verse (risks running out before end of long books). |
| `consumeMin` | `3` | Minimum consume per verse. Prevents stalling on very short verses. |
| `highMatchFraction` | `1.0` | When `matchedCount / verse_words ≥ this`, skip the consume cap and use `lastMatchedSrc + 1` directly. 1.0 = only every canonical word matched. Critical for short heading verses like "The Testimony of Eight Witnesses" where leading unmatched words push `lastMatchedSrc` just past the cap. |
| `tailGapFactor` | `0` | When > 0, enables tail-trim. Gap threshold = `srcPerCanon × tailGapFactor`. |
| `tailTrimMaxMatchFraction` | `0.7` | Tail-trim only fires when `matchFraction` is below this. Keeps it off for normal high-coverage verses. |
| `skipBelowMatchFraction` | `0` | When > 0, the cursor skips canonical verses whose LCS `matchFraction` is below this without consuming source — corrects for sparse / incomplete sources where many canonical verses have no real source counterpart. |
| `anchorWindowWords` | `0` | When > 0, at the start of each segment, the cursor runs an LCS-based anchor search on this many source words to find the best-matching canonical verse-group and jump there. Needed for sources whose surviving fragments don't start at canonical 1:1 (OM). |
| `anchorLookaheadVerses` | `3` | Verse-groups combined into each anchor candidate window. `1` = match per verse (precise but can lose ties); larger values increase recall but blur the anchor position. |
| `srcPerCanonOverride` | `null` | Forces a specific source-words-per-canonical-word ratio instead of the runtime-computed global ratio. Set for sparse sources whose global ratio understates the LOCAL ratio within covered regions (OM is ~0.34 globally but ~1.1 locally). |

`srcPerCanon` is computed at runtime as `source.length / totalCanonWords`.

### Segment-boundary handling

When the LCS finds zero matches for a verse AND we're near the end of a
segment (less than half of `expectedConsume` source words remain), exit the
segment loop without advancing `vgIdx`. The verse's actual content is likely
in the next segment (e.g. a "Chapter 13" heading split it across), and the
trailing fill at the end of `runCursor` will assign the residual source words
to the previous verse (their natural home).

### Book-heading jumps

When entering a segment whose heading text matches a book name
(`headingToBook` returns non-null), the cursor JUMPS `vgIdx` forward to the
first verse group of that canonical book. This corrects any drift accumulated
in the previous segment. Book heading regex is anchored at the start of the
line to avoid mid-sentence false positives. 3-ne requires "son of nephi" to
disambiguate from references to 1-ne in later text.

### Line-break split merging

Manuscript line breaks sometimes fall mid-word ("wher" ending line 30,
"efore" starting line 31). `mergeLineBreakSplits` detects these:

```
w.line !== next.line                            // different lines
&& canonNorms.has(w.norm + next.norm)           // joined form is canonical
&& !canonNorms.has(w.norm)                      // first fragment alone isn't
```

Merged tokens go through the LCS as a single word. The `spanOf` array tracks
which positions were merged so the result can be expanded back to original
source indices after verse assignment. **Both fragments get the same verse**,
and `applyJoins` in `build-output.ts` removes the trailing space between them
visually.

## Per-Source Adapters (`sources/`)

Each source plugs in via a `SourceAdapter`:

```ts
interface SourceAdapter {
  slug: string;                       // "pm", "1830", ...
  label: string;                      // "Printer's Manuscript"
  raw: string;                        // "data/raw/pm"
  out: string;                        // "data/bom/pm"
  cursor: CursorConfig;               // tuning knobs (see table above)
  dictionary?: Map<string, string>;   // optional level-4 dictionary
}
```

`scripts/align/sources/index.ts` registers adapters in an `ADAPTERS` map and
exposes `getAdapter(slug)`. `align-source.ts` reads the slug from `argv[0]`,
resolves the adapter, and runs the pipeline.

### Current adapters

| Slug | Adapter file | Tail-trim | Notes |
|---|---|---|---|
| `pm` | `sources/pm.ts` | off | Default tuning. Source is generally LONGER than canonical. |
| `1830` | `sources/_1830.ts` | `tailGapFactor: 8`, `tailTrimMaxMatchFraction: 0.7` | Source is CLOSE in length to canonical; some clauses dropped in 1830 were restored in later editions. |
| `1837` | `sources/_1837.ts` | `tailGapFactor: 8`, `tailTrimMaxMatchFraction: 0.85` | 1837 retains some of the 1830 variants. Slightly higher trim threshold — same gap but trim fires for verses with higher baseline match coverage. |
| `om` | `sources/om.ts` | n/a | The Original Manuscript is INCOMPLETE — only ~28% of the BoM survives, and the surviving pages jump around the canonical text. Uses the SCAFFOLD algorithm (`algorithm: "scaffold"`) instead of the verse-level LCS cursor — a unique-n-gram anchor-pair scaffold with LIS monotonicity + piecewise-linear interpolation. Token-purity 90.4%. |

The `_1830.ts` filename leading underscore is just to avoid starting a TS
identifier with a digit — the slug `"1830"` is what's used everywhere else.

### On-Disk Layout

| Path | Contents |
|---|---|
| `data/bom/2013/<book>/<ch>.json` | canonical target |
| `data/raw/<slug>/*.json` | raw transcript pages (JS Papers shape: `[{ text, markdown?, chapter, verse, source }]`) |
| `data/bom/<slug>/<book>/<ch>.json` | aligned per-chapter output (the diff UI consumes this) |

The raw `chapter` field is the page number and `verse` is the line-on-page —
artifact of the JS Papers shape, not actual versification.

## Adding a New Source

1. Drop raw transcript files into `data/raw/<slug>/*.json` (JS Papers shape).
2. Create `scripts/align/sources/<slug>.ts` exporting a `SourceAdapter`.
   Start with `cursor: DEFAULT_CURSOR_CONFIG`; tune later if findings are high.
3. Register it in `scripts/align/sources/index.ts` under `ADAPTERS`.
4. Add a deno task: `"align:<slug>": "deno run -A scripts/align-source.ts <slug>"`.
5. Add the display name to `VERSION_DISPLAY_NAMES` in `lib/data.ts` for UI.
6. Run `deno task align:<slug>` and then
   `deno run -A scripts/align-report.ts <slug>`. Inspect
   `data/reports/<slug>/summary.json` for the top-flagged chapters.
7. If a source has dropped clauses / variants like 1830, enable `tailGapFactor`
   in the adapter and tune against the report.
8. For fragmentary sources where source pages jump around canonical text (like
   OM), set `algorithm: "scaffold"` instead of the default cursor.
9. Add 2–3 chapter fixtures to
   `scripts/align/__tests__/fixtures/expected/<slug>/` and a `VersionSuite`
   entry in `integration.test.ts`.
10. As you inspect output, add `overrides` entries for stubborn one-off cases
    the algorithm can't handle (see Overrides section).

## Adding Dictionary Entries

A `Matcher`'s level 4 dictionary is per-adapter and starts empty. Only add
entries that:
- Don't already match at levels 1–3 (check with `matchQuality()`)
- Map a scribal form to a canonical form (e.g. `dearst` → `durst`)
- Are causing actual misalignment per the report

Most words match at level 2 or 3 already (`haveing` → `having`, `exceding` →
`exceeding`). Don't pre-populate with English-spelling-variant pairs.

## Overrides

Per-adapter explicit reassignments for cases the general algorithm gets wrong.
Applied as a post-pass after `pushChapterMarkersForward`. Each override
targets a specific source line (`page`, `line`) and reassigns its words to a
canonical verse. Lives on the adapter:

```ts
overrides: [
  {
    page: 196,
    line: 30,
    // wordIndices?: number[]      — specific indices, or
    // wordRange?:   [start, end]  — inclusive range, or
    // omit both                   — entire line
    target: { book: "hel", chapter: 2, verse: 8 },
    note: "OM filler `& it came to pass` between hel 2:7 and 2:8",
  },
],
```

`apply-overrides.ts` finds matching source words by
`(page, line, wordIndexInLine)` and reassigns them. If an override doesn't
match any source words, a warning prints — alignment changes may have made
the override obsolete; check whether it can be deleted.

### When to add an override vs extend the algorithm

Use an **override** when:
- The scribe added filler / connectives that don't appear in either neighboring
  canonical verse (no structural rule can place them).
- It's a one- or two-verse quirk unique to this edition.

Use an **algorithm change** when:
- The same pattern recurs across many verses.
- The pattern is universal enough to express as a rule without enumeration.

### Current overrides

| Source | Location | Reason |
|---|---|---|
| OM | hel 2:7/8 boundary (page 196 line 30) | OM-specific filler `& it came to pass` not in either canonical verse |

Locked in by `om/hel-2` integration fixture.

## Diagnosing Misalignment

When a verse looks wrong, follow this sequence:

1. **Look at the raw source line(s)** for the boundary. Is the canonical verse
   split across multiple source lines? Are there scribal-deletion or
   editorial-markup tokens (`~~struck~~`, `{{shaded}}`)?
2. **Compare canonical N and N+1** side-by-side. Do they share opening
   phrases? ("And it came to pass" repeats everywhere.) That's the class of
   issues forward-suffix-LCS handles correctly — verify the cursor is finding
   the EARLIEST match.
3. **Check the merge**: does a line-break-split need to be in the canonical
   norm set? Run with `print` instrumentation in `mergeLineBreakSplits` to
   confirm.
4. **Check matchedCount**: if the LCS matched fewer canonical words than
   exist in the verse, the cap will kick in. That's fine for verses where
   the cap should fire. It's bad for verses like "Testimony of Eight Witnesses"
   where leading unmatched words push `lastMatchedSrc` past the cap — those
   need `matchedCount === canon.length` so `highMatchFraction = 1.0` bypasses.
5. **Check for a textual variant** (especially for 1830). If the source is
   missing ~30+ words from the canonical verse, tail-trim should fire — but
   only if `matchFraction < tailTrimMaxMatchFraction`.
6. **Read the report JSON**: `data/reports/<slug>/<book>/<ch>.json` shows
   per-verse findings with type (`leading-bleed`, `trailing-bleed`,
   `chapter-bleed`, `major-misalignment`, `split-word-bleed`).

## Common Pitfalls

- **Tightening `consumeSlack` reduces leading-bleed but can exhaust source
  before the end of long books** (alma 58+ are the first to fall off).
  The `highMatchFraction = 1.0` bypass gives precision without forcing the
  cap loose globally.
- **Lowering `tailGapFactor` too far over-trims legitimate matches**, causing
  the cursor to under-consume and leading-bleed everywhere. Aim for a factor
  that catches genuine missing-clause gaps (~10–30 positions) but not typical
  noise gaps (~2–5).
- **Adding a book-heading pattern requires updating BOTH `isChapterHeading`
  AND `headingToBook`** in `headings.ts`. Inconsistent updates → segment
  boundaries with no book jump.
- **The aligner wipes the output tree before rewriting.** Don't hand-edit
  files under `data/bom/<slug>/` — edit the raw transcript, the adapter,
  or the aligner.
- **Backward LCS backtracking is wrong for this use case** — it finds the
  rightmost match, which is wrong when the same phrase repeats in the next
  chapter. The implementation uses the suffix table + forward backtracking.
  If you "simplify" it back to backward, you'll re-break the 4:38/5:1
  boundary (and many others).
- **Forward backtracking on the PREFIX DP doesn't work** — at (0,0) when all
  dp values are 0, the algorithm can't decide which direction to advance and
  gets stuck advancing canonical without taking matches. Always use the
  suffix table.

## Expected Coverage

| Source | Chapters | Token purity |
|---|---|---|
| PM | 241 | 93.1% |
| 1830 | 241 | 95.2% |
| 1837 | 241 | 96.1% |
| OM | 118 | 90.4% |

**Token-purity audit** (`scripts/align-audit.ts`) is the most reliable signal — fraction of source tokens whose assigned canonical verse actually contains those tokens. Always run the audit after a cursor / scaffold change.

### Two alignment algorithms

| Algorithm | When | Where |
|---|---|---|
| `cursor` (default) | Source covers ~all of canon continuously | `cursor.ts` — verse-level LCS with chapter-heading segmentation |
| `scaffold` | Source is fragmentary / jumps around canon | `scaffold-align.ts` + `ngram-anchor.ts` — unique-n-gram anchor pairs + LIS monotonicity + interpolation |

The scaffold algorithm: any n-gram that appears EXACTLY ONCE in both source and
target is an unambiguous match. Collect those, sort by source position, take an
LIS on target position to discard cross-overs, layer multiple n values (6 → 4 →
3) for sparse coverage. Piecewise-linear interpolation fills in between anchors.
Verses receiving fewer than `scaffoldMinTokensPerVerse` source tokens are
treated as interpolation noise and absorbed into the nearest kept verse.

Specific PM chapters known to be tricky (all aligned correctly):
- 1-ne 3:31 / 4:1 (canonical 3:31 ends "...then why not us"; 4:1 echoes "...his fifty, yea")
- 1-ne 4:38 / 5:1 (canonical 4:38 ends "tent of our father"; 5:1 echoes "wilderness unto our father")
- 1-ne 10:22 / 11:1 (boundary mid-line at PM 19:35)
- mosiah 27:37 / 28:1 (PM has "Chapter 13" between them, plus stray "E" letter scribal artifact)
- witnesses 1:3 / 1:4 (short heading verses with leading unmatched words)

Specific 1830 chapters that exercise tail-trim:
- alma 32:30 (the ~40-word clause dropped from 1830 and restored later) — without tail-trim this cascades through Alma 33–63
- alma 50, alma 58 (downstream chapters that go from 100% misaligned to 0 findings once tail-trim catches the alma 32 variant)

All of these are locked in by `__tests__/integration.test.ts`.

## Testing

- **Unit tests** (`*.test.ts` next to each module): match, tokenize, cursor, build-output.
- **Integration tests** (`__tests__/integration.test.ts`): per-version
  `VersionSuite` entries with golden-file fixtures.
- **Run with `deno task test`** — full suite takes ~18 seconds.

When you change the cursor / matcher / adapter tuning, regenerate the
fixtures for affected chapters:

```bash
deno task align:pm
deno task align:1830
# Replace the affected fixture(s)
jq '[.[] | select(.book == "alma" and .chapter == 32)]' \
   data/bom/1830/alma/32.json \
   > scripts/align/__tests__/fixtures/expected/1830/alma-32.json
# Repeat for other affected chapters, then run the tests to confirm.
deno task test
```

## What NOT to Do

- **Don't add an LLM cleanup pass.** This pipeline is deliberately LLM-free.
- **Don't reintroduce a chapter-level LCS or tail anchor.** With verse-level
  granularity, the whole verse IS the boundary unit.
- **Don't add per-chapter `srcPerCanon` overrides.** The global ratio +
  `highMatchFraction = 1.0` bypass handles per-chapter variation naturally.
- **Don't widen `windowSlack` past ~2.0.** Larger windows reintroduce
  chapter-level vocabulary-bleed problems.
- **Don't enable tail-trim globally.** It exists for sources with dropped
  clauses (1830). For sources where source ≥ canonical (PM), tail-trim risks
  cutting legit matches.
- **Don't introduce module-level mutable state in `match.ts`.** The matcher
  is a factory function so each `runCursor` call gets its own dictionary
  scope.
