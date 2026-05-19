import type { ComponentChildren } from "preact";
import type { Verse } from "../lib/data.ts";
import { Diff } from "./Diff.tsx";
import ChapterNavDialog from "../islands/ChapterNavDialog.tsx";

interface Props {
  verses1: Verse[];
  verses2: Verse[];
  select1: ComponentChildren;
  select2: ComponentChildren;
  book: string;
  chapter: string;
  prev: { book: string; chapter: string } | null;
  next: { book: string; chapter: string } | null;
  v1: string;
  v2: string;
  highlightVerses: Set<number> | null;
}

function NonExtantView(
  { verses1, verses2, highlightVerses }: {
    verses1: Verse[];
    verses2: Verse[];
    highlightVerses: Set<number> | null;
  },
) {
  const rows = Math.max(verses1.length, verses2.length, 1);
  const cells: ReturnType<typeof renderCell>[] = [];
  for (let i = 0; i < rows; i++) {
    cells.push(renderCell(verses1[i], 1, i + 1, highlightVerses));
    cells.push(renderCell(verses2[i], 2, i + 1, highlightVerses));
  }
  return <>{cells}</>;
}

function renderCell(
  verse: Verse | undefined,
  col: 1 | 2,
  row: number,
  highlightVerses: Set<number> | null,
) {
  const padding = col === 1
    ? { paddingLeft: "1.5rem", paddingRight: "1rem" }
    : { paddingLeft: "1rem", paddingRight: "1.5rem" };
  const base = {
    gridRow: row,
    paddingTop: "0.5rem",
    paddingBottom: "0.5rem",
    margin: "0",
    scrollMarginTop: "6rem",
    ...padding,
  };
  if (!verse) {
    if (row !== 1) {
      return <p style={{ ...base, gridColumnStart: col }} />;
    }
    return (
      <p
        style={{
          ...base,
          gridColumnStart: col,
          color: "var(--color-verse-num)",
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        Non-extant
      </p>
    );
  }
  const isHighlighted = col === 1 && !!verse &&
    !!highlightVerses?.has(verse.verse);
  const leftPad = isHighlighted ? "calc(1.5rem - 3px)" : "1.5rem";
  const borderStyle = isHighlighted
    ? { borderLeft: "3px solid var(--color-accent)" }
    : {};

  return (
    <p
      id={`v-${verse.verse}`}
      style={{
        ...base,
        gridColumnStart: col,
        paddingLeft: col === 1 ? leftPad : undefined,
        ...borderStyle,
      }}
    >
      <span
        style={{
          color: "var(--color-verse-num)",
          fontSize: "0.6875rem",
          fontFamily: "sans-serif",
          fontWeight: 500,
          marginRight: "0.375rem",
        }}
      >
        {verse.verse}
      </span>
      {verse.markdown ?? verse.text}
    </p>
  );
}

export function DiffPage({
  verses1,
  verses2,
  select1,
  select2,
  book,
  chapter,
  prev,
  next,
  v1,
  v2,
  highlightVerses,
}: Props) {
  const qs = `?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`;

  return (
    <main>
      <div style={{ maxWidth: "56rem", margin: "0 auto", overflowX: "clip" }}>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
          {/* Title bar */}
          <div
            style={{
              position: "relative",
              background: "var(--color-header-title)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1.5rem",
            }}
          >
            {prev
              ? (
                <a
                  href={`/${prev.book}/${prev.chapter}${qs}`}
                  style={{
                    color: "var(--color-header-subtle)",
                    fontSize: "1.25rem",
                    lineHeight: 1,
                    textDecoration: "none",
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  ‹
                </a>
              )
              : <span style={{ flex: 1 }} />}
            <div style={{ textAlign: "center", flex: 1 }}>
              <ChapterNavDialog
                book={book}
                chapter={chapter}
                v1={v1}
                v2={v2}
              />
            </div>
            {next
              ? (
                <a
                  href={`/${next.book}/${next.chapter}${qs}`}
                  style={{
                    color: "var(--color-header-subtle)",
                    fontSize: "1.25rem",
                    lineHeight: 1,
                    textDecoration: "none",
                    flex: 1,
                    textAlign: "right",
                  }}
                >
                  ›
                </a>
              )
              : <span style={{ flex: 1 }} />}
          </div>
          {/* Edition selector row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              background: "var(--color-header-edition)",
            }}
          >
            <div
              data-tutorial="version-selector"
              style={{
                borderRight: "1px solid var(--color-header-border)",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              {select1}
            </div>
            <div
              data-tutorial="version-selector"
              style={{ minWidth: 0, overflow: "hidden" }}
            >
              {select2}
            </div>
          </div>
        </div>

        {/* Reader body */}
        <div
          data-diff-container
          class="grid grid-cols-2 relative"
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.9375rem",
            lineHeight: "1.85",
            color: "var(--color-text)",
            backgroundColor: "var(--color-bg)",
          }}
        >
          {/* Column divider */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: "1px",
              background: "var(--color-divider)",
              pointerEvents: "none",
            }}
          />
          {verses1.length === 0 || verses2.length === 0
            ? (
              <NonExtantView
                verses1={verses1}
                verses2={verses2}
                highlightVerses={highlightVerses}
              />
            )
            : (
              <Diff
                verses1={verses1}
                verses2={verses2}
                startRow={0}
                highlightVerses={highlightVerses}
              />
            )}
        </div>
      </div>
    </main>
  );
}
