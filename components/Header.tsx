import TutorialTrigger from "../islands/TutorialTrigger.tsx";
import HeaderIconButton from "./HeaderIconButton.tsx";

export default function Header({ showTutorial }: { showTutorial: boolean }) {
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
      <p style={{ margin: 0 }}>
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
      </p>
      {showTutorial && <TutorialTrigger />}
      <HeaderIconButton href="/about" label="About" style={{ right: "1.5rem" }}>
        i
      </HeaderIconButton>
    </header>
  );
}
