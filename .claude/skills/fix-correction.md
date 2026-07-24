---
name: fix-correction
description: Use when resolving a user-submitted text-correction GitHub issue (label "correction") — verse-boundary word moves, spacing/hyphenation joins, transcription typos in the aligned Book of Mormon texts.
---

# Fix Correction

Resolve a `correction`-labeled GitHub issue filed by the site's report form.
Apply the fix to the working tree and STOP — a human verifies and commits.

## Workflow

### 1. Pick the issue

With an issue number: `gh issue view <n> --json title,body,url`.
Without one: `gh issue list -l correction --state open` and take the oldest.

### 2. Parse

The issue body ends with a fenced ```json block containing:
`version`, `comparedWith`, `book`, `chapter`, `verses`, `errorType`,
`selectedText`, `expectedText`, `description`, `url`. `version` may be
`"unsure"` — inspect both versions to find the wrong side.

### 3. Reproduce

Load `data/bom/<version>/<book>/<chapter>.json` and read the reported verses
(and their `lines` with page/line provenance). Find the raw transcript under
`data/raw/<version>/`. Confirm the reported text is actually wrong — compare
against `data/bom/2013/` and, for manuscripts/editions, the `source`
facsimile URL on the verse lines.

If the report is NOT reproducible or not actually an error, comment the
reasoning on the issue (`gh issue comment <n> --body "..."`), tell the human,
and stop. Do not close the issue yourself.

### 4. Classify and fix

Read `.claude/skills/aligning-texts.md` for pipeline details. Decision tree,
in order:

1. **Line-break word split** (e.g. `command ments`, `righteous- ness`):
   check the stitch/pre-merge stage (`scripts/shared/stitch.ts`,
   `scripts/align/merge-splits.ts`) and the raw transcript's line-break
   markers first. A pipeline fix repairs every instance of the pattern;
   prefer it over per-word overrides. Search other chapters for the same
   pattern before deciding.
2. **Words on the wrong side of a verse boundary**: add an `Override` entry
   to `scripts/align/sources/<version>.ts` (`page`, `line`,
   `wordIndices`/`wordRange`, `target`, required `note`). Get page/line from
   the verse's `lines` in the chapter JSON.
3. **Transcription typo**: fix `data/raw/<version>/` directly, verifying
   against the facsimile `source` URL.

Combined fixes are common (a split word crossing a verse boundary needs 1+2).

### 5. Realign and verify

```bash
deno task align:<version>
git diff --stat data/bom/<version>/
git diff data/bom/<version>/<book>/<chapter>.json
deno task pre-commit
```

Confirm: the reported error is fixed in the chapter JSON; no unexplained
collateral changes in other chapters (investigate every changed file);
checks pass.

### 6. Hand off — do NOT commit

Run `git status` (another agent may be working). Then report to the human:

- What the error was and the root cause
- Files changed and why
- The verification diff for the reported verses
- Any collateral changes and why they're correct
- A suggested commit message ending with `fixes #<n>` so the issue
  auto-closes on push

STOP here. The human reviews and commits.
