import TutorialTrigger from "../islands/TutorialTrigger.tsx";

export default function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--color-divider)",
        padding: "0.5rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        backgroundColor: "var(--color-page-bg)",
      }}
    >
      <h1 style={{ margin: 0 }}>
        <a
          href="/"
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.75rem",
            letterSpacing: "0.18em",
            color: "var(--color-muted)",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Book of Mormon Compare
        </a>
      </h1>
      <TutorialTrigger />
      <a
        href="/about"
        aria-label="About"
        title="About"
        style={{
          position: "absolute",
          right: "1.5rem",
          fontFamily: "sans-serif",
          fontSize: "0.75rem",
          color: "var(--color-muted)",
          textDecoration: "none",
          lineHeight: 1,
        }}
      >
        ⓘ
      </a>
    </header>
  );
}
