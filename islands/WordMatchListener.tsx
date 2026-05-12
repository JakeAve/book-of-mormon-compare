import { useEffect } from "preact/hooks";

export default function WordMatchListener() {
  useEffect(() => {
    const container = document.querySelector(
      "[data-diff-container]",
    ) as HTMLElement | null;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!("wordMatch" in target.dataset)) return;

      const otherId = target.id.startsWith("a")
        ? target.id.replace(/^a/, "b")
        : target.id.replace(/^b/, "a");
      const other = document.getElementById(otherId);

      const active = "var(--color-word-match)";
      target.style.backgroundColor = target.style.backgroundColor === active
        ? ""
        : active;
      if (other) {
        other.style.backgroundColor = other.style.backgroundColor === active
          ? ""
          : active;
      }
    }

    function clearSelectionHighlights() {
      container!.querySelectorAll(".word-match-selected").forEach((el) => {
        el.classList.remove("word-match-selected");
      });
    }

    function handleSelectionChange() {
      clearSelectionHighlights();

      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      const spans = container!.querySelectorAll<HTMLElement>("[data-word-match]");
      spans.forEach((span) => {
        if (!range.intersectsNode(span)) return;
        const otherId = span.id.startsWith("a")
          ? span.id.replace(/^a/, "b")
          : span.id.replace(/^b/, "a");
        const other = document.getElementById(otherId);
        if (other) other.classList.add("word-match-selected");
      });
    }

    container.addEventListener("click", handleClick);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      container.removeEventListener("click", handleClick);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  // deno-lint-ignore jsx-no-useless-fragment
  return <></>;
}
