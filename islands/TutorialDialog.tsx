import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";

interface TutorialStep {
  title: string;
  body: ComponentChildren;
  domElements?: string[];
}

const swatch = (color: string, label: string) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.375rem",
      marginRight: "0.5rem",
    }}
  >
    <span
      style={{
        display: "inline-block",
        width: "1rem",
        height: "0.875rem",
        borderRadius: "2px",
        backgroundColor: `var(${color})`,
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    />
    <span>{label}</span>
  </span>
);

const STEPS: TutorialStep[] = [
  {
    title: "Highlights",
    domElements: [".highlight"],
    body: (
      <>
        <p style={{ margin: "0 0 0.75rem" }}>
          Words and phrases that differ between versions are highlighted inline.
        </p>
        <p style={{ margin: "0 0 0.5rem" }}>
          {swatch(
            "--color-side1-highlight",
            "Left column — text present here but changed or absent on the right",
          )}
        </p>
        <p style={{ margin: "0 0 0.5rem" }}>
          {swatch(
            "--color-side2-highlight",
            "Right column — text present here but changed or absent on the left",
          )}
        </p>
        <p style={{ margin: "0" }}>
          {swatch(
            "--color-word-match",
            "Matching word — click any highlighted word to see its counterpart",
          )}
        </p>
      </>
    ),
  },
  {
    title: "Changing Chapters",
    domElements: ["[data-tutorial='chapter-nav']"],
    body: (
      <p style={{ margin: 0 }}>
        Click the <strong>book and chapter title</strong>{" "}
        in the header to open the chapter navigator. From there you can jump to
        any book or chapter in the Book of Mormon.
      </p>
    ),
  },
  {
    title: "Switching Versions",
    domElements: ["[data-tutorial='version-selector']"],
    body: (
      <p style={{ margin: 0 }}>
        Use the <strong>version selectors</strong>{" "}
        below the title bar to choose which edition appears in each column. You
        can compare any two versions side by side.
      </p>
    ),
  },
  {
    title: "Verse Sources",
    domElements: ["[data-tutorial='verse-source']"],
    body: (
      <p style={{ margin: 0 }}>
        For aligned versions (Original Manuscript, Printer's Manuscript, 1830,
        and 1837), clicking the <strong>verse number</strong>{" "}
        opens a popup listing each contributing manuscript line. Each line links
        to the original source — the Joseph Smith Papers or other archival sites
        — in a new tab.
      </p>
    ),
  },
  {
    title: "Mark & Share",
    body: (
      <>
        <p style={{ margin: "0 0 0.75rem" }}>
          Select any text in the comparison to get a small menu:
        </p>
        <div
          style={{
            position: "relative",
            paddingTop: "2.25rem",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              display: "inline-flex",
              gap: "0.125rem",
              background: "var(--color-header-edition)",
              border: "1px solid var(--color-header-border)",
              borderRadius: "0.375rem",
              padding: "0.25rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
            }}
          >
            {["Mark", "Share"].map((label) => (
              <span
                key={label}
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.625rem",
                  borderRadius: "0.25rem",
                  color: "var(--color-header-text)",
                  fontFamily: "sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <p
            style={{
              border: "1px solid var(--color-dialog-border)",
              padding: "1rem",
              margin: 0,
              fontSize: "0.875rem",
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: "var(--color-verse-num)" }}>1</span>{" "}
            I, Nephi, having been{" "}
            <mark
              style={{
                background: "rgba(74, 124, 219, 0.25)",
                color: "inherit",
                borderRadius: "0.125rem",
                padding: "0 0.125rem",
              }}
            >
              born of goodly parents
            </mark>
            , therefore I was taught somewhat in all the learning of my father.
          </p>
        </div>
        <p style={{ margin: "0 0 0.5rem" }}>
          <strong>Mark</strong>{" "}
          highlights the selected verses with a colored stripe and saves them in
          the URL — useful for bookmarking a passage.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Share</strong>{" "}
          copies a link to the clipboard that opens directly to the marked
          verses.
        </p>
      </>
    ),
  },
  {
    title: "Manuscript Markings",
    body: (
      <>
        <p style={{ margin: "0 0 0.75rem" }}>
          The Original and Printer's Manuscripts include editorial markings from
          the Joseph Smith Papers transcription:
        </p>
        <p style={{ margin: "0 0 0.5rem" }}>
          <span
            style={{ textDecoration: "line-through", marginRight: "0.5rem" }}
          >
            crossed out
          </span>
          — text the scribe deleted
        </p>
        <p style={{ margin: "0 0 0.5rem" }}>
          <span style={{ color: "var(--color-muted)", marginRight: "0.5rem" }}>
            dimmed
          </span>
          — text that is hard to read but assumed
        </p>
        <p style={{ margin: 0 }}>
          <span
            style={{
              fontStyle: "italic",
              verticalAlign: "super",
              fontSize: "0.85em",
              marginRight: "0.5rem",
            }}
          >
            raised
          </span>
          — text inserted above the line or in the margin
        </p>
      </>
    ),
  },

  {
    title: "You're ready!",
    domElements: ["[data-tutorial='tutorial-trigger']"],
    body: (
      <p style={{ margin: 0 }}>
        That's everything. Enjoy exploring the text. You can reopen this
        tutorial by clicking on the{" "}
        <span
          aria-label="Open tutorial button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1rem",
            height: "1rem",
            borderRadius: "50%",
            border: "1.5px solid currentColor",
            fontSize: "0.625rem",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ?
        </span>
      </p>
    ),
  },
];

function applyHighlights(selectors: string[] | undefined) {
  if (!selectors) return;
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      el.classList.add("tutorial-highlight");
    });
  }
}

function clearHighlights() {
  document.querySelectorAll(".tutorial-highlight").forEach((el) =>
    el.classList.remove("tutorial-highlight")
  );
}

export default function TutorialDialog() {
  const step = useSignal(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const url = new URL(globalThis.location.href);
    if (url.searchParams.has("tutorial")) {
      url.searchParams.delete("tutorial");
      globalThis.history.replaceState(
        null,
        "",
        url.pathname + (url.search ? url.search : "") + url.hash,
      );
      step.value = 0;
      dialogRef.current?.showModal();
      applyHighlights(STEPS[0]?.domElements);
    }
    function onOpen() {
      step.value = 0;
      dialogRef.current?.showModal();
      applyHighlights(STEPS[0]?.domElements);
    }
    globalThis.addEventListener("tutorial:open", onOpen);
    return () => globalThis.removeEventListener("tutorial:open", onOpen);
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function onBackdropClick(e: MouseEvent) {
      if (e.target === d) closeDialog();
    }
    function onCancel() {
      clearHighlights();
    }
    d.addEventListener("click", onBackdropClick);
    d.addEventListener("cancel", onCancel);
    return () => {
      d.removeEventListener("click", onBackdropClick);
      d.removeEventListener("cancel", onCancel);
    };
  }, []);

  useEffect(() => {
    clearHighlights();
    if (dialogRef.current?.open) {
      applyHighlights(STEPS[step.value]?.domElements);
    }
    return clearHighlights;
  }, [step.value]);

  function closeDialog() {
    clearHighlights();
    dialogRef.current?.close();
  }

  function prev() {
    step.value = Math.max(0, step.value - 1);
  }

  function next() {
    if (step.value === STEPS.length - 1) {
      closeDialog();
    } else {
      step.value = step.value + 1;
    }
  }

  const current = STEPS[step.value];
  const isFirst = step.value === 0;
  const isLast = step.value === STEPS.length - 1;

  return (
    <dialog ref={dialogRef} class="tutorial-dialog">
      <div class="tutorial-header">
        <span class="tutorial-title">{current.title}</span>
        <button
          type="button"
          class="tutorial-close"
          aria-label="Close tutorial"
          onClick={closeDialog}
        >
          ×
        </button>
      </div>
      <div class="tutorial-body">
        {current.body}
      </div>
      <div class="tutorial-footer">
        <button
          type="button"
          class={`tutorial-btn${isFirst ? " tutorial-btn-hidden" : ""}`}
          onClick={prev}
          aria-hidden={isFirst}
          tabIndex={isFirst ? -1 : undefined}
        >
          Back
        </button>
        <span class="tutorial-counter">{step.value + 1} / {STEPS.length}</span>
        <button
          type="button"
          class={`tutorial-btn${isLast ? " tutorial-btn-primary" : ""}`}
          onClick={next}
        >
          {isLast ? "Got it" : "Next"}
        </button>
      </div>
    </dialog>
  );
}
