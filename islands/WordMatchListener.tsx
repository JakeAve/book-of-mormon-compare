import { useEffect } from "preact/hooks";

export default function WordMatchListener() {
  useEffect(() => {
    const container = document.querySelector(
      "[data-diff-container]",
    ) as HTMLElement | null;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.dataset.wordMatch) return;

      const otherId = target.id.startsWith("a")
        ? target.id.replace(/^a/, "b")
        : target.id.replace(/^b/, "a");
      const other = document.getElementById(otherId);

      const active = "var(--color-word-match)";
      target.style.backgroundColor = target.style.backgroundColor === active ? "" : active;
      if (other) {
        other.style.backgroundColor = other.style.backgroundColor === active ? "" : active;
      }
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, []);

  return <></>;
}
