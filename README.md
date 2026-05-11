# Book of Mormon Compare

A side-by-side diff viewer for comparing different versions of the Book of Mormon, built with [Fresh 2](https://fresh.deno.dev/) and Deno.

## Features

- Side-by-side verse comparison across multiple text versions
- Word-level diff highlighting (additions and removals)
- Interactive word match highlighting — click a word to highlight all matching words across both columns
- Version selector per column via URL query params (`?v1=stub&v2=stub2`)
- Dynamic routing by book and chapter: `/:book/:chapter`

## Project Structure

```
routes/
  index.tsx            # Redirects to 1-ne/1
  [book]/[chapter].tsx # Main comparison page
components/
  DiffPage.tsx         # Two-column layout with verse diffs
  Diff.tsx             # Renders a single verse diff
  WordMatch.tsx        # Word match highlight component
islands/
  VersionSelector.tsx  # Interactive version picker
  WordMatchListener.tsx # Handles word match click events
lib/
  data.ts              # Loads verse data from data/bom/<version>/<book>/<chapter>.json
  diff.ts              # Word-level LCS diff algorithm
  textHelpers.ts       # Text tokenization utilities
data/
  bom/<version>/       # One directory per text version, containing JSON verse files
```

## Data Format

Each chapter is a JSON file at `data/bom/<version>/<book>/<chapter>.json` containing an array of verses:

```json
[
  { "chapter": 1, "verse": 1, "text": "...", "markdown": "..." }
]
```

Versions are discovered automatically from subdirectories of `data/bom/`. A `stub` version is included for development.

## Setup

Install Deno: https://docs.deno.com/runtime/getting_started/installation

```bash
# Development
deno task dev

# Build
deno task build

# Start production server
deno task start

# Lint + format check
deno task check
```
