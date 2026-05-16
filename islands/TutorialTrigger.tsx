import HeaderIconButton from "../components/HeaderIconButton.tsx";

export default function TutorialTrigger() {
  function onClick() {
    globalThis.dispatchEvent(new CustomEvent("tutorial:open"));
  }

  return (
    <HeaderIconButton
      onClick={onClick}
      label="Open tutorial"
      style={{ right: "3.5rem" }}
      data-tutorial="tutorial-trigger"
    >
      ?
    </HeaderIconButton>
  );
}
