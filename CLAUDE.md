# Book of Mormon Compare — Claude Rules

## Project Overview

Side-by-side diff viewer for comparing different versions of the Book of Mormon.
Built with [Fresh 2](https://fresh.deno.dev/) (Preact SSR + islands), Deno,
Vite, and Tailwind CSS v4.

## Stack

- **Runtime:** Deno
- **Framework:** Fresh 2 (file-based routing, islands architecture)
- **UI:** Preact + `@preact/signals` for island state
- **Styles:** Tailwind CSS v4 (utility classes + CSS variables for theming)
- **Build:** Vite via `@fresh/plugin-vite`
- **Tests:** `deno test` — test files live alongside source in `lib/*.test.ts`

## Common Commands

```bash
deno task dev       # Start dev server (Vite)
deno task build     # Production build → _fresh/
deno task start     # Serve production build
deno task check     # fmt check + lint + type check (run before committing)
deno run -A lib/*.test.ts  # Run unit tests
deno task align:om  # Re-run Original Manuscript alignment script
deno task align:pm  # Re-run Printer's Manuscript alignment script
```

## Architecture

### Routing

- `routes/index.tsx` — redirects to `1-ne/1`
- `routes/[book]/[chapter].tsx` — main comparison page, URL params
  `?v1=<version>&v2=<version>`
- `routes/about.tsx` — static about page

### Key Files

- `lib/data.ts` — all data types (`Verse`, `VerseLine`), version/book constants,
  chapter loading, adjacent chapter navigation
- `lib/diff.ts` — word-level LCS diff algorithm
- `lib/textHelpers.ts` — text tokenization
- `lib/bookChapters.ts` — book/chapter metadata
- `components/DiffPage.tsx` — two-column layout
- `components/Diff.tsx` — single verse diff renderer
- `islands/VersionSelector.tsx` — interactive version picker (client island)
- `islands/WordMatchListener.tsx` — word click highlight events (client island)
- `islands/ChapterNavDialog.tsx` — jump-to-chapter dialog (client island)

### Database / Persistence

- `db/interface.ts` — `SecurityStore` interface (domain-specific methods:
  `isBanned`, `setBan`, `record404`)
- `db/kv.ts` — `DenoKvSecurityStore`: Deno KV implementation of `SecurityStore`;
  owns all key construction, prefix, and atomic retry logic
- `utils/security.ts` — `SecurityService` accepts a `SecurityStore`; handles
  probe detection, ban logic, and logging; no KV imports

The `db/` layer is intentionally isolated so the KV backend can be replaced
without touching `SecurityService`. To swap backends, implement `SecurityStore`
and pass the new instance in `main.ts`.

### Data

All text lives in `data/bom/<version>/<book>/<chapter>.json`. Versions are
auto-discovered from subdirectories at runtime.

**Verse JSON format:**

```json
[{ "chapter": 1, "verse": 1, "text": "...", "markdown": "..." }]
```

**Aligned verse format** (Original/Printer's Manuscript):

```json
[{
  "chapter": 1,
  "verse": 1,
  "lines": [
    {
      "id": "1:1",
      "page": 1,
      "line": 1,
      "text": "...",
      "source": "https://..."
    }
  ]
}]
```

Aligned verses are normalized to the `Verse` type at load time via
`normalizeVerse`.

**Current versions:**

| Key              | Display Name                                     |
| ---------------- | ------------------------------------------------ |
| `stub` / `stub2` | Dev stubs                                        |
| `2013`           | 2013 Church of Jesus Christ of Latter-day Saints |
| `om`             | Original Manuscript                              |
| `pm`             | Printer's Manuscript                             |

To add a new version, create `data/bom/<key>/` and add the display name to
`VERSION_DISPLAY_NAMES` in `lib/data.ts`.

## Code Conventions

- TypeScript throughout; no `any` unless unavoidable
- Fresh islands are in `islands/` — only add interactivity there, keep
  components server-rendered by default
- CSS variables drive the color theme; use them rather than hardcoding colors
- `@/` is the path alias for the project root
- No comments unless the WHY is non-obvious

## Testing

Unit tests use Deno's built-in test runner. Run with:

```bash
deno test lib/
```

Tests cover: diff algorithm, text tokenization, data helpers, book/chapter
utilities, and security/IP-banning logic.

## Data Pipeline (Manuscript Alignment)

Scripts in `scripts/` align raw manuscript transcripts into verse-structured
JSON.

```bash
deno task align:om   # Original Manuscript → data/bom/om/
deno task align:pm   # Printer's Manuscript → data/bom/pm/
```

Raw source files live in `data/raw/`.
