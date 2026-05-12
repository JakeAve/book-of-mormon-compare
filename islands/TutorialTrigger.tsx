export default function TutorialTrigger() {
  function onClick() {
    globalThis.dispatchEvent(new CustomEvent("tutorial:open"));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open tutorial"
      title="Tutorial"
      style={{
        position: "absolute",
        right: "3.5rem",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "sans-serif",
        fontSize: "0.75rem",
        color: "var(--color-muted)",
        lineHeight: 1,
      }}
    >
      <span
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
    </button>
  );
}
