import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

const KINDS = [
  { kind: "capitalization", label: "Capitalization" },
  { kind: "punctuation", label: "Punctuation" },
  { kind: "spelling", label: "Spelling" },
  { kind: "addition", label: "Addition" },
  { kind: "omission", label: "Omission" },
  { kind: "wordChange", label: "Word change" },
] as const;

const STORAGE_KEY = "bofm-diff-inactive";

// How far you must scroll after tapping the collapsed bar before it shrinks again.
const PIN_SLACK = 60;

function applyToContainer(inactive: Set<string>) {
  const container = document.querySelector("[data-diff-container]");
  if (container) {
    container.setAttribute("data-diff-inactive", [...inactive].join(" "));
  }
}

export default function DiffTypeFilter() {
  const inactive = useSignal<Set<string>>(new Set());
  const open = useSignal(true);
  const pinnedAt = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      inactive.value = new Set(stored.split(" ").filter(Boolean));
    }
    applyToContainer(inactive.value);

    const onScroll = () => {
      const y = globalThis.scrollY;
      if (y < 8) {
        pinnedAt.current = null;
        open.value = true;
        return;
      }
      if (pinnedAt.current !== null) {
        if (Math.abs(y - pinnedAt.current) < PIN_SLACK) return;
        pinnedAt.current = null;
      }
      open.value = false;
    };
    onScroll();
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    return () => globalThis.removeEventListener("scroll", onScroll);
  }, []);

  function toggle(kind: string) {
    const next = new Set(inactive.value);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    inactive.value = next;
    localStorage.setItem(STORAGE_KEY, [...next].join(" "));
    applyToContainer(next);
  }

  const collapsed = !open.value;

  if (collapsed) {
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => {
          pinnedAt.current = globalThis.scrollY;
          open.value = true;
        }}
        style={{
          display: "block",
          width: "100%",
          padding: "0.25rem 1.5rem",
          border: "none",
          background: "var(--color-bg)",
          color: "var(--color-verse-num)",
          fontFamily: "sans-serif",
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        Filters
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Filter highlights by change type"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
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
