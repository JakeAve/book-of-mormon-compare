---
name: aligning-texts-v2
description: Use when working on the verse-level LCS alignment pipeline that maps Book of Mormon source texts (Printer's Manuscript, Original Manuscript, 1830, etc.) onto the canonical 2013 book/chapter/verse structure. Covers how the cursor, tokenizer, matcher, and segment builder work together, the tuning constants, and how to diagnose misalignment.
---

# Aligning Texts (Verse-Level LCS)

## Overview

The alignment pipeline maps a source text (Printer's Manuscript, etc.) to the
canonical 2013 `(book, chapter, verse)` triples. It's a five-stage pipeline:
tokenize → segment by heading → per-verse LCS → expand merged splits → write
chapter JSON. No LLM calls, no external services. Output mirrors
`data/bom/2013/`: per-chapter JSON files with a `lines` array per verse.

The core idea: instead of one big LCS per chapter, run a small LCS per
canonical verse. Each verse gets a window of ~25–50 source words. This keeps
the next verse's vocabulary out of view and bounds drift to a single verse
before the next iteration recovers.

## When to Use

- Tuning alignment quality when a verse boundary looks wrong
- Adding a new source text (1830, 1837, etc.) — register a tokenizer and run
- Debugging a specific chapter / verse misalignment reported by the report tool
- Modifying the matcher, cursor, or segment builder

## Quick Reference

```bash
deno task align:pm          # run the full alignment
deno task report:pm         # report misalignment findings against 2013 canon
deno task test              # all unit + integration tests
```

Full PM alignment takes ~7 seconds.

## Pipeline Layout

```
scripts/
  align/
    types.ts            SourceWord, TargetWord, LineInfo, CursorResult
    match.ts            Tiered fuzzy matcher (4 levels)
    tokenize-source.ts  PM raw pages → SourceWord[] + LineInfo map
    tokenize-target.ts  2013 canonical → TargetWord[], groupByVerse()
    cursor.ts           Per-verse LCS with chapter-heading segmentation,
                        line-break split merging, and forward suffix backtracking
    segment.ts          CursorResult[] → OutVerse[] (line splits, applyJoins,
                        markdown slicing)
    __tests__/
      integration.test.ts  Golden-file fixtures + aligner1 regression checks
      fixtures/expected/   Expected JSON for 3 test chapters
  align-source.ts       Entry point — tokenize, align, write
```

## How a Source Word Becomes an OutLine

1. **Tokenize** PM raw JSON pages into a flat `SourceWord[]` (normalized for
   matching, raw preserved for output). Each word remembers its page, line,
   and word-index-in-line.
2. **Pre-merge line-break splits**: scan adjacent tokens from different lines
   where `norm(A) + norm(B)` is a canonical word and `norm(A)` alone is not.
   "wher" + "efore" → "wherefore" gets emitted as a single source token before
   the LCS runs. Tracked via a `spanOf: Uint8Array` so the result can be
   expanded back to original positions afterwards.
3. **Segment by heading**: split the source at PM lines that match
   chapter/book heading patterns ("Chapter II", "The Book of Jacob"). The book
   heading determines the canonical book the cursor jumps into. Plain "Chapter
   N" headings only create a segment boundary; they don't change the book.
4. **Per-verse LCS** (the cursor): iterate `verseGroups` sequentially. For
   each verse, take a small window of source words ahead of the current
   `srcOffset`, run a suffix-LCS forward backtracking, and consume up to the
   last matched source position. Move to the next verse.
5. **Expand merged tokens**: a merged source token (`spanOf[i] = 2`) gets
   emitted as TWO `CursorResult` entries — one for each original source
   fragment — both assigned to the same verse. The segment builder's
   `applyJoins` then merges them visually.
6. **Build per-chapter output** in `segment.ts`: group `CursorResult[]` by
   verse, then by source line. Split lines that span verses into `a`/`b`
   segments with suffix IDs (`"8:25a"`, `"8:25b"`). Call `applyJoins` (from
   the legacy `scripts/align/stitch.ts` — keep importing it) to handle
   mid-word line-break joins. Slice markdown using `buildTextToMdMapping`.

## The Tiered Matcher (`match.ts`)

`matches(a, b)` returns true if two normalized words should be considered
the same. Four levels, tried in order:

| Level | Check | Notes |
|-------|-------|-------|
| 1 | `a === b` | exact normalized match |
| 2 | First+last letter + length within ±2 | only fires when both words ≥ 5 chars (short words risk false positives like "him"/"hum") |
| 3 | Levenshtein ≤ threshold (1/2/3 for ≤5/6-9/10+ chars) | only fires when both ≥ 4 chars |
| 4 | Dictionary lookup (scribal → canonical) then re-run levels 1–3 | starts empty; add entries incrementally as the report reveals persistent misalignments |

`matchQuality(a, b)` returns the level (0 = no match). Both inputs must be
pre-normalized (lowercase, `&` → `and`, punctuation stripped).

## The Cursor (`cursor.ts`)

The cursor processes the source segment-by-segment, verse-by-verse. Key
behaviors:

### Per-verse LCS with suffix-table forward backtracking

For each verse, we build the SUFFIX LCS table (`ds[i][j]` = LCS for
source[i..m-1] vs canonical[j..n-1]). Then we walk forward from (0,0),
taking a match only when `ds[fi][fj] === ds[fi+1][fj+1] + 1` (the match is
on an optimal suffix path).

**Why suffix + forward?** Backward backtracking always finds the RIGHTMOST
occurrence of each canonical word in source. When the same phrase appears
in the next verse/chapter (e.g. "our father" in canonical 4:38 AND 5:1),
the rightmost match lands in the wrong verse. Forward backtracking matches
each canonical word to the EARLIEST valid source position.

### Tuning constants

| Constant | Default | What it controls |
|---|---|---|
| `WINDOW_SLACK` | `1.5` | Per-verse window = `verse_words × srcPerCanon × WINDOW_SLACK`. Larger = sees more source (more recall, more next-verse bleed). |
| `WINDOW_MIN` | `20` | Minimum window words. Ensures even short verses have enough source to match. |
| `CONSUME_SLACK` | `1.10` | Consume cap = `verse_words × srcPerCanon × CONSUME_SLACK`. Larger = consume more per verse (risks running out before end of long books). |
| `CONSUME_MIN` | `3` | Minimum consume per verse. Prevents stalling on very short verses. |
| `HIGH_MATCH_FRACTION` | `1.0` | When `matchedCount / verse_words >= this`, skip the consume cap and use `lastMatchedSrc + 1` directly. 1.0 = only every canonical word matched. Critical for short heading verses like "The Testimony of Eight Witnesses" where leading unmatched words push `lastMatchedSrc` just past the cap. |

`srcPerCanon` is computed at runtime as `source.length / totalCanonWords`.
Don't add per-source ratios — the global ratio works because we're using
verse-level granularity.

### Segment-boundary handling

When the LCS finds zero matches for a verse AND we're near the end of a
segment (less than half of `expectedConsume` source words remain), exit the
segment loop without advancing `vgIdx`. The verse's actual content is
likely in the next segment (e.g. a "Chapter 13" PM heading split it
across), and the trailing fill at the end of `runCursor` will assign the
residual source words to the previous verse (their natural home).

### Book-heading jumps

When entering a segment whose heading text matches a book name
(`headingToBook` returns non-null), the cursor JUMPS `vgIdx` forward to the
first verse group of that canonical book. This corrects any drift
accumulated in the previous segment. Book heading regex is anchored at the
start of the line (`^the book of nephi his`, etc.) to avoid mid-sentence
false positives. 3-ne requires "son of nephi" to disambiguate from
references to 1-ne in later text.

### Line-break split merging

Manuscript line breaks sometimes fall mid-word ("wher" ending line 30,
"efore" starting line 31). `mergeLineBreakSplits` detects these:

```
w.line !== next.line                            // different lines
&& canonNorms.has(w.norm + next.norm)           // joined form is canonical
&& !canonNorms.has(w.norm)                      // first fragment alone isn't
```

Merged tokens go through the LCS as a single word. The `spanOf` array
tracks which positions were merged so the result can be expanded back to
original source indices after verse assignment. **Both fragments get the
same verse**, and `applyJoins` in `segment.ts` removes the trailing space
between them visually.

## On-Disk Layout

| Path | Contents |
|---|---|
| `data/bom/2013/<book>/<ch>.json` | canonical target |
| `data/raw/<slug>/*.json` | raw transcript pages (JS Papers shape: `[{ text, markdown?, chapter, verse, source }]`) |
| `data/bom/<slug>/<book>/<ch>.json` | aligned per-chapter output (UI consumes this) |

The OM raw uses `chapter` as page number and `verse` as line-on-page —
that's just an artifact of the JS Papers shape. PM raw has the same shape.

## Adding a New Source

1. Drop raw transcript files into `data/raw/<slug>/*.json` (JS Papers shape).
2. Register the slug in the entry point script. If the raw shape matches
   `tokenize-source.ts`, no loader changes needed.
3. Add a deno task: `"align:<slug>": "deno run -A scripts/align-source.ts <slug>"`.
4. Add the display name to `VERSION_DISPLAY_NAMES` in `lib/data.ts`.
5. Run `deno task align:<slug>` and check the coverage report.
6. If a specific verse misaligns, look at the boundary in the PM (see
   "Diagnosing Misalignment" below).

## Adding Dictionary Entries

The matcher's level 4 dictionary starts empty. Only add entries that:
- Don't already match at levels 1–3 (check with `matchQuality()`)
- Map a scribal form to a canonical form (e.g. `dearst` → `durst`)
- Are causing actual misalignment per the report

Most words match at level 2 or 3 already (`haveing` → `having`, `exceding`
→ `exceeding`). Don't pre-populate with English-spelling-variant pairs.
Add them when the report tool shows they'd fix something.

## Diagnosing Misalignment

When a verse looks wrong, follow this sequence:

1. **Look at the raw PM line(s)** for the boundary. Is the canonical
   verse split across multiple PM lines? Are there scribal-deletion or
   editorial-markup tokens (`~~struck~~`, `{{shaded}}`)?
2. **Compare canonical N and N+1** side-by-side. Do they share opening
   phrases? ("And it came to pass" repeats everywhere.) That's the
   class of issues forward-suffix-LCS handles correctly — verify the
   cursor is finding the EARLIEST match.
3. **Check the merge**: does a line-break-split need to be in the
   canonical norm set? Run with `print` instrumentation in
   `mergeLineBreakSplits` to confirm.
4. **Check matchedCount**: if the LCS matched fewer canonical words than
   exist in the verse, the cap will kick in. That's fine for verses where
   the cap should fire (preventing next-verse over-consumption). It's bad
   for verses like "Testimony of Eight Witnesses" where leading unmatched
   words push `lastMatchedSrc` past the cap — those need `matchedCount ===
   canon.length` so `HIGH_MATCH_FRACTION = 1.0` bypasses the cap.
5. **Read the report JSON**: `data/reports/<slug>/<book>/<ch>.json` shows
   per-verse findings with type (`leading-bleed`, `trailing-bleed`,
   `chapter-bleed`, `major-misalignment`, `split-word-bleed`).

## Common Pitfalls

- **Tightening `CONSUME_SLACK` reduces leading-bleed but can exhaust source
  before the end of long books** (alma 58+ are the first to fall off).
  Loosening it solves coverage but causes leading-bleed. The
  `HIGH_MATCH_FRACTION = 1.0` bypass gives precision without forcing the
  cap loose globally.
- **Adding a book-heading pattern requires updating BOTH `isChapterHeading`
  (which controls segmentation) AND `headingToBook` (which controls book
  jumps)**. Inconsistent updates → segment boundaries with no book jump,
  causing the next book's verses to be processed in the current book's
  segment.
- **Headings appearing mid-text are false positives.** The `headingToBook`
  patterns are anchored at the start of the line, but loose patterns like
  `the book of mormon` can match references like "and behold this is the
  Book of Mormon" if the regex isn't tight. The current patterns require
  specific contexts (1-ne needs "his", 3-ne needs "son of nephi", etc.).
  Add new patterns carefully.
- **Per-chapter PM/canonical ratios vary**, but the cursor uses a global
  `srcPerCanon`. For most chapters this is fine because verse-level
  windows are small. If a specific book has a systematically different
  ratio (e.g. 2013 expanded heavily), the global ratio may cause cap
  issues. The `HIGH_MATCH_FRACTION = 1.0` bypass mostly hides this.
- **The aligner wipes the output tree before rewriting.** Don't hand-edit
  files under `data/bom/<slug>/` — edit the raw transcript or the aligner.
- **Backward LCS backtracking is wrong for this use case** — it finds the
  rightmost match, which is wrong when the same phrase repeats in the next
  chapter. The implementation uses the suffix table + forward
  backtracking. If you "simplify" it back to backward, you'll re-break the
  4:38/5:1 boundary (and many others).
- **Forward backtracking on the PREFIX DP doesn't work** — at (0,0) when
  all dp values are 0, the algorithm can't decide which direction to
  advance and gets stuck advancing canonical without taking matches.
  Always use the suffix table.

## Expected Coverage

After full PM alignment:

- **All 17 books represented**
- **6,643 verses output** (matches canonical count, ~6,639 in aligner1)
- **~3,400 verses-with-findings** in the report (slightly better than
  aligner1's ~3,477)

Specific chapters known to be tricky:
- 1-ne 3:31 / 4:1 (canonical 3:31 ends "...then why not us"; 4:1 echoes
  "...his fifty, yea")
- 1-ne 4:38 / 5:1 (canonical 4:38 ends "tent of our father"; 5:1 echoes
  "wilderness unto our father")
- 1-ne 10:22 / 11:1 (boundary mid-line at PM 19:35)
- mosiah 27:37 / 28:1 (PM has "Chapter 13" between them, plus stray "E"
  letter scribal artifact)
- witnesses 1:3 / 1:4 (short heading verses with leading unmatched words)

All of these are correctly aligned now. If you make changes and one
regresses, the integration tests in `__tests__/integration.test.ts` will
catch it.

## Testing

- **Unit tests** (`*.test.ts` next to each module): match, tokenize,
  cursor, segment.
- **Integration tests** (`__tests__/integration.test.ts`): three
  golden-file fixtures (1-ne/3, 1-ne/11, mosiah/23) plus regression
  checks that aligner output stays at-or-below the legacy aligner's
  finding counts on those chapters.
- **Run with `deno task test`** — full suite takes ~90 seconds (most of
  it is the integration tests running the full pipeline).

When you change the cursor or matcher, regenerate the fixtures:
```bash
deno task align:pm
cp data/bom/pm/1-ne/3.json scripts/align/__tests__/fixtures/expected/1-ne-3.json
cp data/bom/pm/1-ne/11.json scripts/align/__tests__/fixtures/expected/1-ne-11.json
cp data/bom/pm/mosiah/23.json scripts/align/__tests__/fixtures/expected/mosiah-23.json
```

Then verify the regression tests still pass — they assert aligner has
**fewer than or equal to** the legacy aligner's findings on each chapter.

## What NOT to Do

- **Don't add an LLM cleanup pass.** This pipeline is deliberately
  LLM-free. If a chapter genuinely can't be aligned by LCS (e.g. heavy
  paraphrase), the affected verses end up with low match quality rather
  than confidently-wrong placements.
- **Don't try to use the OM's `——` chapter break marker for PM.** PM
  doesn't use that convention. Heading detection is the right anchor.
- **Don't reintroduce a tail-anchor for the chapter LCS.** With
  verse-level granularity, the whole verse IS the boundary unit; there's
  no chapter-level tail to anchor.
- **Don't add per-chapter `srcPerCanon` overrides.** The global ratio +
  `HIGH_MATCH_FRACTION = 1.0` bypass handles per-chapter variation
  naturally. Per-chapter overrides are a maintenance burden with
  diminishing returns.
- **Don't widen `WINDOW_SLACK` past ~2.0.** The point of a small window
  is to keep the next verse's vocabulary out of view. Larger windows
  reintroduce the chapter-level vocabulary-bleed problems.
