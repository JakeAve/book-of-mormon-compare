export default function BetaBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.4rem 1.5rem",
        borderBottom: "1px solid var(--color-divider)",
        backgroundColor: "var(--color-page-bg)",
        fontSize: "0.75rem",
        color: "var(--color-muted)",
      }}
    >
      This app is in beta —{" "}
      <a
        href="https://github.com/JakeAve/book-of-mormon-compare/issues"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--color-muted)",
          textDecoration: "underline",
          marginLeft: "0.25rem",
        }}
      >
        give feedback on GitHub
      </a>
    </div>
  );
}
