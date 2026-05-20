import { useEffect, useRef } from "preact/hooks";
import { useSignal, useSignalEffect } from "@preact/signals";
import { parseMarkParam, serializeMarkParam } from "../lib/verseMark.ts";
import { toast } from "./toastSignal.ts";

interface Props {
  book: string;
  chapter: string;
  v1: string;
  v2: string;
}

interface MenuState {
  x: number;
  y: number;
  verses: number[];
  above: boolean;
}

function getVerseFromNode(node: Node | null): number | null {
  let el: Element | null = node instanceof Element
    ? node
    : node?.parentElement ?? null;
  while (el) {
    const v = (el as HTMLElement).dataset?.verse;
    if (v !== undefined) {
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    }
    el = el.parentElement;
  }
  return null;
}

function applyMarkStyle(el: HTMLElement, isMarked: boolean) {
  const col = el.style.gridColumnStart;
  if (isMarked) {
    el.style.backgroundColor = "var(--color-mark-bg)";
    if (col === "1") {
      el.style.borderLeft = "3px solid var(--color-mark-line)";
      el.style.paddingLeft = "calc(1.5rem - 3px)";
    } else {
      el.style.borderRight = "3px solid var(--color-mark-line)";
      el.style.paddingRight = "calc(1.5rem - 3px)";
    }
  } else {
    el.style.backgroundColor = "";
    if (col === "1") {
      el.style.borderLeft = "";
      el.style.paddingLeft = "";
    } else {
      el.style.borderRight = "";
      el.style.paddingRight = "";
    }
  }
}

export default function SelectionMenu(_props: Props) {
  const menu = useSignal<MenuState | null>(null);
  const marked = useSignal<Set<number>>(new Set<number>());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    marked.value = parseMarkParam(
      new URLSearchParams(globalThis.location.search).get("mark"),
    ) ?? new Set();
  }, []);

  useEffect(() => {
    const container = document.querySelector(
      "[data-diff-container]",
    ) as HTMLElement | null;
    if (!container) return;

    function getSelectedVerses(): number[] {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return [];
      const anchor = getVerseFromNode(sel.anchorNode);
      const focus = getVerseFromNode(sel.focusNode);
      if (!anchor) return [];
      if (!focus || anchor === focus) return [anchor];
      const [lo, hi] = anchor < focus ? [anchor, focus] : [focus, anchor];
      return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    }

    function handleSelectionChange() {
      const verses = getSelectedVerses();
      if (verses.length === 0) {
        menu.value = null;
        return;
      }
      const sel = document.getSelection()!;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const above = rect.top > 60;
      menu.value = {
        x: rect.left + rect.width / 2,
        y: above ? rect.top : rect.bottom,
        verses,
        above,
      };
    }

    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      menu.value = null;
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  useSignalEffect(() => {
    const current = marked.value;
    document.querySelectorAll<HTMLElement>("[data-verse]").forEach((el) => {
      const v = Number(el.dataset.verse);
      if (!v) return;
      applyMarkStyle(el, current.has(v));
    });
  });

  function handleMark() {
    const verses = menu.value?.verses ?? [];
    const next = new Set(marked.value);
    const allMarked = verses.every((v) => next.has(v));
    for (const v of verses) {
      allMarked ? next.delete(v) : next.add(v);
    }
    marked.value = next;

    const url = new URL(globalThis.location.href);
    if (next.size > 0) {
      url.searchParams.set("mark", serializeMarkParam(next));
    } else {
      url.searchParams.delete("mark");
    }
    history.pushState(null, "", url.toString());

    menu.value = null;
    document.getSelection()?.removeAllRanges();
  }

  function handleShare() {
    const verses = menu.value?.verses ?? [];
    const combined = new Set([...marked.value, ...verses]);
    const url = new URL(globalThis.location.href);
    url.searchParams.set("mark", serializeMarkParam(combined));
    url.hash = `v-${Math.min(...combined)}`;
    navigator.clipboard.writeText(url.toString()).catch(() => {});
    toast.value = { url: url.toString() };
    menu.value = null;
    document.getSelection()?.removeAllRanges();
  }

  const m = menu.value;
  if (!m) return null;

  const ACTIONS = [
    { label: "Mark", onClick: handleMark },
    { label: "Share", onClick: handleShare },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: m.x,
        top: m.above ? m.y - 8 : m.y + 8,
        transform: m.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
        zIndex: 100,
        display: "flex",
        gap: "2px",
        background: "var(--color-header-edition)",
        border: "1px solid var(--color-header-border)",
        borderRadius: "6px",
        padding: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        pointerEvents: "auto",
      }}
    >
      {ACTIONS.map(({ label, onClick }) => (
        <button
          key={label}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onClick();
          }}
          style={{
            padding: "4px 10px",
            border: "none",
            borderRadius: "4px",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-header-text)",
            fontFamily: "sans-serif",
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
