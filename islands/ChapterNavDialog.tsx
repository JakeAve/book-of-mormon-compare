import { useEffect, useRef } from "preact/hooks";
import {
  BOOK_DISPLAY_NAMES,
  BOOK_ORDER,
  type BookAbbr,
  getBookDisplayName,
} from "../lib/data.ts";
import { buildChapterHref, CHAPTER_COUNTS } from "../lib/bookChapters.ts";

interface Props {
  book: string;
  chapter: string;
  v1: string;
  v2: string;
}

export default function ChapterNavDialog(
  { book, chapter, v1, v2 }: Props,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeChipRef = useRef<HTMLAnchorElement>(null);

  function openDialog() {
    const d = dialogRef.current;
    if (!d) return;
    d.showModal();
    // After the dialog is shown, focus and scroll the current chapter into view.
    queueMicrotask(() => {
      activeChipRef.current?.focus();
      activeChipRef.current?.scrollIntoView({ block: "center" });
    });
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  // Close when the user clicks the backdrop (clicks land on the <dialog> itself).
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function onClick(e: MouseEvent) {
      if (e.target === d) closeDialog();
    }
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, []);

  const currentBook = book;
  const currentChapter = chapter;
  const displayName = getBookDisplayName(book);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-label={`Navigate to chapter (currently ${displayName} ${chapter})`}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
          display: "inline-flex",
          alignItems: "baseline",
          gap: "0.375rem",
        }}
      >
        <span
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "var(--color-header-text)",
          }}
        >
          {displayName}
        </span>
        <span
          style={{ color: "var(--color-header-border)", margin: "0 0.25rem" }}
        >
          ·
        </span>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--color-header-muted)",
          }}
        >
          Chapter {chapter}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: "0.75rem",
            color: "var(--color-header-subtle)",
            marginLeft: "0.125rem",
          }}
        >
          ▾
        </span>
      </button>

      <dialog
        ref={dialogRef}
        class="chapter-nav-dialog"
      >
        <header class="chapter-nav-header">
          <span class="chapter-nav-title">Navigate</span>
          <button
            type="button"
            class="chapter-nav-close"
            aria-label="Close"
            onClick={closeDialog}
          >
            ×
          </button>
        </header>

        <div class="chapter-nav-body">
          {BOOK_ORDER.map((b) => {
            const count = CHAPTER_COUNTS[b as BookAbbr];
            const isCurrentBook = b === currentBook;
            return (
              <section
                key={b}
                class={`chapter-nav-book-row${
                  isCurrentBook ? " is-current" : ""
                }`}
              >
                <h3 class="chapter-nav-book-name">
                  <span>{BOOK_DISPLAY_NAMES[b as BookAbbr]}</span>
                  <span class="chapter-nav-book-count">{count}</span>
                </h3>
                <div class="chapter-nav-chips">
                  {Array.from({ length: count }, (_, i) => {
                    const ch = String(i + 1);
                    const isActive = isCurrentBook && ch === currentChapter;
                    return (
                      <a
                        key={ch}
                        ref={isActive ? activeChipRef : undefined}
                        href={buildChapterHref(b, ch, v1, v2)}
                        class={`chapter-nav-chip${
                          isActive ? " is-active" : ""
                        }`}
                        aria-label={`${
                          BOOK_DISPLAY_NAMES[b as BookAbbr]
                        } ${ch}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {ch}
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </dialog>
    </>
  );
}
