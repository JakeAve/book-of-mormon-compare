import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
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
    domElements: ["[data-diff-container]"],
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
        Verse numbers that are <strong>links</strong>{" "}
        open the original source document — the Joseph Smith Papers, the Church
        of Jesus Christ of Latter-day Saints website, or other archival sites —
        in a new tab.
      </p>
    ),
  },
  {
    title: "You're ready!",
    body: (
      <p style={{ margin: 0 }}>
        That's everything. Enjoy exploring the text. You can reopen this
        tutorial any time by adding{" "}
        <code style={{ fontSize: "0.875em" }}>?tutorial</code> to the URL.
      </p>
    ),
  },
];

const step = signal(0);

function applyHighlights(selectors: string[] | undefined) {
  if (!selectors) return;
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) =>
      el.classList.add("tutorial-highlight")
    );
  }
}

function clearHighlights() {
  document.querySelectorAll(".tutorial-highlight").forEach((el) =>
    el.classList.remove("tutorial-highlight")
  );
}

export default function TutorialDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (new URLSearchParams(globalThis.location.search).has("tutorial")) {
      step.value = 0;
      dialogRef.current?.showModal();
    }
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    function onBackdropClick(e: MouseEvent) {
      if (e.target === d) close();
    }
    d.addEventListener("click", onBackdropClick);
    return () => d.removeEventListener("click", onBackdropClick);
  }, []);

  useEffect(() => {
    clearHighlights();
    if (dialogRef.current?.open) {
      applyHighlights(STEPS[step.value]?.domElements);
    }
    return clearHighlights;
  }, [step.value]);

  function close() {
    clearHighlights();
    dialogRef.current?.close();
  }

  function prev() {
    step.value = Math.max(0, step.value - 1);
  }

  function next() {
    if (step.value === STEPS.length - 1) {
      close();
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
          onClick={close}
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
