import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";

// Alphabetical by label. The tutorial renders this same list, so the legend and
// the tutorial cannot drift out of order or out of vocabulary.
export const KINDS = [
  { kind: "addition", label: "Addition", swatch: "--color-diff-addition-2" },
  {
    kind: "capitalization",
    label: "Capitalization",
    swatch: "--color-diff-capitalization-2",
  },
  { kind: "omission", label: "Omission", swatch: "--color-diff-omission-1" },
  {
    kind: "punctuation",
    label: "Punctuation",
    swatch: "--color-diff-punctuation-2",
  },
  { kind: "spelling", label: "Spelling", swatch: "--color-diff-spelling-2" },
  {
    kind: "wordChange",
    label: "Word change",
    swatch: "--color-diff-wordchange-2",
  },
] as const;

const STORAGE_KEY = "bofm-diff-inactive";

function applyToContainer(inactive: Set<string>) {
  const container = document.querySelector("[data-diff-container]");
  if (container) {
    container.setAttribute("data-diff-inactive", [...inactive].join(" "));
  }
}

export default function DiffTypeFilter() {
  const inactive = useSignal<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      inactive.value = new Set(stored.split(" ").filter(Boolean));
    }
    applyToContainer(inactive.value);

    // The legend wraps to 1-3 rows depending on width, so the sticky header has
    // no fixed height to hardcode. Publish the measured height for the verse
    // anchors instead — see VERSE_SCROLL_MARGIN_TOP in components/Diff.tsx.
    const header = document.querySelector<HTMLElement>("[data-sticky-header]");
    if (!header) return;
    const publish = () => {
      document.documentElement.style.setProperty(
        "--sticky-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  function toggle(kind: string) {
    const next = new Set(inactive.value);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    inactive.value = next;
    localStorage.setItem(STORAGE_KEY, [...next].join(" "));
    applyToContainer(next);
  }

  return (
    <div
      role="group"
      aria-label="Filter highlights by change type"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.5rem 1.5rem",
        fontFamily: "sans-serif",
        fontSize: "0.75rem",
        background: "var(--color-bg)",
      }}
    >
      {KINDS.map(({ kind, label }) => {
        const off = inactive.value.has(kind);
        return (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            aria-pressed={!off}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.5rem",
              borderRadius: "9999px",
              border: "1px solid var(--color-chip-bg-hover)",
              background: "var(--color-chip-bg)",
              color: "var(--color-text)",
              cursor: "pointer",
              opacity: off ? 0.4 : 1,
              textDecoration: off ? "line-through" : "none",
            }}
          >
            <span class="diff-swatch" data-diff-kind={kind} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
