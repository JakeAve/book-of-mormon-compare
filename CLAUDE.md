# Book of Mormon Compare — Claude Rules

## Project Overview

Side-by-side diff viewer for comparing different versions of the Book of Mormon.
Built with [Fresh 2](https://fresh.deno.dev/) (Preact SSR + islands), Deno,
Vite, and Tailwind CSS v4.

User-facing setup lives in [README.md](./README.md). This file is for repo
standards and structure.

## Stack

- **Runtime:** Deno (KV enabled via `"unstable": ["kv"]`)
- **Framework:** Fresh 2 (file-based routing, islands architecture)
- **UI:** Preact + `@preact/signals` for island state
- **Styles:** Tailwind CSS v4 (utility classes + CSS variables for theming)
- **Build:** Vite via `@fresh/plugin-vite`
- **Tests:** `deno test` — colocated `*.test.ts`

## Common Commands

```bash
deno task dev          # Dev server (Vite)
deno task build        # Production build → _fresh/
deno task start        # Serve production build
deno task check        # fmt check + lint + type check
deno task test         # All unit tests
deno task pre-commit   # check + test (also run by .githooks/pre-commit)
deno task pre-push     # check + test (also run by .githooks/pre-push)
deno task align:om     # Re-run Original Manuscript alignment
deno task align:pm     # Re-run Printer's Manuscript alignment
deno task align:1830   # Re-run 1830 First Edition alignment
deno task align:1837   # Re-run 1837 Second Edition alignment
```

Always run `deno task pre-commit` (or let the git hook run it) before
committing. The pre-push hook runs the same checks.

## Directory Map

### `routes/`

File-based routes. Server-rendered by default.

- `_app.tsx` — root document shell (header, footer, global styles)
- `_error.tsx` — error page
- `index.tsx` — redirects to `1-ne/1`
- `about.tsx` — about page
- `og-image.ts` — dynamic OG image renderer (uses `lib/ogImage.ts`)
- `[book]/index.tsx` — book landing (redirects to chapter 1)
- `[book]/[chapter].tsx` — main comparison page, URL params
  `?v1=<version>&v2=<version>`

### `components/` (server-rendered)

- `DiffPage.tsx` — two-column layout
- `Diff.tsx` — single verse diff renderer
- `WordMatch.tsx` — word-match highlight markup
- `Header.tsx`, `Footer.tsx`, `HeaderIconButton.tsx` — chrome
- `BetaBanner.tsx` — pre-release notice

### `islands/` (client-interactive)

- `VersionSelector.tsx` — per-column version picker
- `WordMatchListener.tsx` — click-to-highlight word matches
- `ChapterNavDialog.tsx` — jump-to-chapter dialog
- `SwipeNavigator.tsx` — touch swipe between chapters
- `ScrollRestorer.tsx` — preserves scroll across navigations
- `SelectionMenu.tsx` — verse selection / share / copy menu
- `TutorialDialog.tsx`, `TutorialTrigger.tsx` — first-visit tutorial

### `lib/`

Pure modules with colocated tests.

- **Data:** `data.ts` (types `Verse`/`VerseLine`, version & book constants,
  chapter loading, adjacent navigation), `bookChapters.ts` (book/chapter
  metadata), `verseMark.ts`, `manuscriptMarkup.ts`
- **Diff:** `diff.ts` (word-level LCS), `textHelpers.ts` (tokenization)
- **Infra:** `config.ts` (`SITE_URL`), `logger.ts`, `ogImage.ts`, `fontData.ts`

### `db/` and `utils/`

Security/persistence layer. Intentionally split so the storage backend can be
swapped without touching the service.

- `db/interface.ts` — `SecurityStore` interface (domain methods: `isBanned`,
  `setBan`, `record404`)
- `db/kv.ts` — `DenoKvSecurityStore`: Deno KV implementation; owns all key
  construction, prefixing, and atomic retry logic
- `utils/security.ts` — `SecurityService` accepts a `SecurityStore`; handles
  probe detection, ban logic, logging. No KV imports.
- `utils/middleware/ip-block.ts` — blocks banned IPs
- `utils/middleware/probe-detect.ts` — records suspicious 404s and bans on
  threshold
- `utils/state.ts` — request-scoped state

To swap backends, implement `SecurityStore` and pass the new instance in
`main.ts`.

### `scripts/align/`

Modular manuscript alignment pipeline (entry point: `scripts/align-source.ts`).

- `paths.ts` — version → raw source / output paths
- `sources/` — per-version raw loaders (e.g. `om.ts`, `bom2013.ts`)
- `anchor.ts` → `bucket.ts` → `stitch.ts` → `normalize.ts` — pipeline stages
- `types.ts` — shared pipeline types

### `data/`

- `data/bom/<version>/<book>/<chapter>.json` — verse JSON consumed at runtime
- `data/raw/<version>/` — raw transcripts consumed by the alignment scripts

## Data Formats

**Verse JSON** (`data/bom/<version>/<book>/<chapter>.json`):

```json
[{ "chapter": 1, "verse": 1, "text": "...", "markdown": "..." }]
```

**Aligned verse** (Original/Printer's Manuscript, 1830, 1837):

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
`normalizeVerse` in `lib/data.ts`.

**Current versions:**

| Key    | Display Name                                     |
| ------ | ------------------------------------------------ |
| `om`   | Original Manuscript                              |
| `pm`   | Printer's Manuscript                             |
| `1830` | 1830 First Edition                               |
| `1837` | 1837 Second Edition                              |
| `2013` | 2013 Church of Jesus Christ of Latter-day Saints |

To add a new version: drop chapter JSON in `data/bom/<key>/`, add display name
to `VERSION_DISPLAY_NAMES` in `lib/data.ts`. Versions are auto-discovered from
subdirectories at runtime.

## Code Conventions

- TypeScript throughout; no `any` unless unavoidable
- Server-render by default; only put code in `islands/` if it needs to be
  interactive on the client
- Use CSS variables from the theme rather than hardcoding colors
- `@/` is the path alias for the project root
- No comments unless the WHY is non-obvious — name things well instead
- Don't reference current tasks/PRs/issues in comments
- Colocate tests as `*.test.ts` next to the source

## Testing

`deno task test` runs everything. Coverage includes: diff algorithm, text
tokenization, data helpers, book/chapter utilities, manuscript markup, verse
marks, OG image generation, logger, security/IP-banning, and the stitch stage of
the alignment pipeline.

## Environment

- `SITE_URL` — canonical site URL (used by `lib/config.ts` for OG images and
  absolute links). Defaults to `https://bofm.scripturecompare.org`.
