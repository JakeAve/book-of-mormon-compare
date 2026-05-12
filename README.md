# Book of Mormon Compare

A side-by-side diff viewer for comparing different versions of the Book of Mormon, built with [Fresh 2](https://fresh.deno.dev/) and Deno.

## Features

- Side-by-side verse comparison across multiple text versions
- Word-level diff highlighting (additions and removals)
- Interactive word match highlighting — click a word to highlight all matching words across both columns
- Version selector per column via URL query params (`?v1=stub&v2=stub2`)
- Jump-to-chapter dialog for quick navigation
- Dynamic routing by book and chapter: `/:book/:chapter`
- Non-extant chapters (present in one version, missing in another) are clearly marked

## Text Versions

| Key | Description |
|-----|-------------|
| `2013` | 2013 Church of Jesus Christ of Latter-day Saints edition |
| `om` | Original Manuscript |
| `pm` | Printer's Manuscript |

## Project Structure

```
routes/
  index.tsx            # Redirects to 1-ne/1
  about.tsx            # About page
  [book]/[chapter].tsx # Main comparison page
components/
  DiffPage.tsx         # Two-column layout with verse diffs
  Diff.tsx             # Renders a single verse diff
  WordMatch.tsx        # Word match highlight component
islands/
  VersionSelector.tsx      # Interactive version picker
  WordMatchListener.tsx    # Handles word match click events
  ChapterNavDialog.tsx     # Jump-to-chapter dialog
lib/
  data.ts              # Data types, version/book constants, chapter loading
  diff.ts              # Word-level LCS diff algorithm
  textHelpers.ts       # Text tokenization utilities
  bookChapters.ts      # Book/chapter metadata
scripts/
  align-source.ts      # Manuscript alignment pipeline
data/
  bom/<version>/       # One directory per text version, containing JSON verse files
  raw/                 # Raw source transcripts for alignment scripts
```

## Data Format

Each chapter is a JSON file at `data/bom/<version>/<book>/<chapter>.json` containing an array of verses:

```json
[
  { "chapter": 1, "verse": 1, "text": "...", "markdown": "..." }
]
```

Aligned sources (Original Manuscript, Printer's Manuscript) use a line-based format:

```json
[
  {
    "chapter": 1, "verse": 1,
    "lines": [{ "id": "1:1", "page": 1, "line": 1, "text": "...", "source": "https://..." }]
  }
]
```

Versions are discovered automatically from subdirectories of `data/bom/`. To add a new version, create `data/bom/<key>/` and register the display name in `VERSION_DISPLAY_NAMES` in `lib/data.ts`.

## Setup

Install Deno: https://docs.deno.com/runtime/getting_started/installation

```bash
# Development
deno task dev

# Build
deno task build

# Start production server
deno task start

# Lint + format check + type check
deno task check

# Unit tests
deno test lib/
```

## Data Pipeline

Manuscript alignment scripts normalize raw transcripts into verse-structured JSON:

```bash
deno task align:om   # Original Manuscript → data/bom/om/
deno task align:pm   # Printer's Manuscript → data/bom/pm/
```

## Disclaimer

This project is an independent study and research tool. It is not affiliated with, endorsed by, or sponsored by The Church of Jesus Christ of Latter-day Saints, the Community of Christ, or any other church or organization. All scriptural text belongs to its respective publishers; this site presents it for comparative study.
