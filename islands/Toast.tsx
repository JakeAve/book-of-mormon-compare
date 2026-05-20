import { useEffect } from "preact/hooks";
import { toast } from "./toastSignal.ts";

export default function Toast() {
  const t = toast.value;

  useEffect(() => {
    if (!t) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") toast.value = null;
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [t]);

  if (!t) return null;

  function dismiss() {
    toast.value = null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        width: "clamp(280px, 92vw, 480px)",
        background: "var(--color-dialog-bg)",
        border: "1px solid var(--color-dialog-border)",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        zIndex: 200,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "var(--color-text)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--color-dialog-border)",
        }}
      >
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-muted)",
          }}
        >
          Link copied
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          style={{
            background: "transparent",
            border: "none",
            fontSize: "1.5rem",
            lineHeight: 1,
            color: "var(--color-muted)",
            cursor: "pointer",
            padding: "0 0.25rem",
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          padding: "0.875rem 1rem",
          fontFamily: "monospace",
          fontSize: "0.8125rem",
          wordBreak: "break-all",
          color: "var(--color-muted)",
          lineHeight: 1.5,
        }}
      >
        {t.url}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "0.625rem 1rem 0.75rem",
          borderTop: "1px solid var(--color-dialog-border)",
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "0.8125rem",
            fontWeight: 600,
            padding: "0.4rem 0.875rem",
            borderRadius: "6px",
            border: "1px solid var(--color-dialog-border)",
            background: "var(--color-chip-bg)",
            color: "var(--color-text)",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
