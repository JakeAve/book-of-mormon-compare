import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

const STORAGE_KEY = "beta-banner-dismissed";

export default function BetaBanner() {
  const visible = useSignal(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      visible.value = true;
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    visible.value = false;
  }

  if (!visible.value) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.4rem 1.5rem",
        borderBottom: "1px solid var(--color-divider)",
        backgroundColor: "var(--color-page-bg)",
        fontSize: "0.75rem",
        color: "var(--color-muted)",
        position: "relative",
      }}
    >
      <span>
        This app is in beta —{" "}
        <a
          href="https://github.com/JakeAve/book-of-mormon-compare/issues"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--color-muted)", textDecoration: "underline" }}
        >
          give feedback on GitHub
        </a>
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss beta banner"
        style={{
          position: "absolute",
          right: "1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-muted)",
          fontSize: "1rem",
          lineHeight: 1,
          padding: "0.25rem",
        }}
      >
        ×
      </button>
    </div>
  );
}
