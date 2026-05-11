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
}: Props) {
  const qs = `?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`;

  return (
    <main style={{ paddingBottom: "4rem" }}>
      <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
          {/* Title bar */}
          <div
            style={{
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
                  }}
                >
                  ‹
                </a>
              )
              : <span style={{ display: "inline-block", width: "1rem" }} />}
            <div style={{ textAlign: "center" }}>
              <ChapterNavDialog book={book} chapter={chapter} v1={v1} v2={v2} />
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
                  }}
                >
                  ›
                </a>
              )
              : <span style={{ display: "inline-block", width: "1rem" }} />}
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
              style={{ borderRight: "1px solid var(--color-header-border)" }}
            >
              {select1}
            </div>
            <div>{select2}</div>
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
          <Diff verses1={verses1} verses2={verses2} startRow={0} />
        </div>
      </div>
    </main>
  );
}
