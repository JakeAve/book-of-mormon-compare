import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { VerseLine } from "@/lib/data.ts";
import {
  type ManuscriptKind,
  parseManuscriptMarkup,
} from "@/lib/manuscriptMarkup.ts";
import { insertSpaceBetween } from "@/lib/textHelpers.ts";

function verseLabel(verse: number) {
  return verse === 0 ? "Intro" : verse;
}

function kindStyle(kind: ManuscriptKind): Record<string, string> {
  switch (kind) {
    case "deleted":
      return { textDecoration: "line-through" };
    case "unclear":
      return { color: "var(--color-muted)" };
    case "inserted":
      return { fontWeight: "600" };
    default:
      return {};
  }
}

interface Props {
  verse: number;
  lines: VerseLine[];
}

export default function VerseLinePopup({ verse, lines }: Props) {
  const open = useSignal(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open.value) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        open.value = false;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") open.value = false;
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open.value]);

  return (
    <>
      <style>
        {`.verse-source-link:hover,.verse-source-link:focus{text-decoration:underline}`}
      </style>
      <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          data-tutorial="verse-source"
          aria-expanded={open.value}
          aria-label={`Verse ${verseLabel(verse)} — view source lines`}
          onClick={() => (open.value = !open.value)}
          style={{
            color: "var(--color-verse-num)",
            fontSize: "0.6875rem",
            fontFamily: "sans-serif",
            fontWeight: "500",
            marginRight: "0.375rem",
            background: "none",
            border: "none",
            padding: "0",
            cursor: "pointer",
          }}
        >
          {verseLabel(verse)}
        </button>
        {open.value && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "0",
              zIndex: 50,
              background: "var(--color-dialog-bg)",
              border: "1px solid var(--color-dialog-border)",
              borderRadius: "0.375rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: "16rem",
              maxWidth: "22rem",
              maxHeight: "min(20rem, 60vh)",
              overflowY: "auto",
              padding: "0.25rem 0",
            }}
            role="list"
          >
            {lines.map((line) => <LineEntry key={line.id} line={line} />)}
          </div>
        )}
      </span>
    </>
  );
}

function LineEntry({ line }: { line: VerseLine }) {
  const parsed = parseManuscriptMarkup(line.markdown ?? line.text);

  const preview = (
    <span
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flex: "1",
        minWidth: 0,
        color: "var(--color-text)",
      }}
    >
      {parsed.map((token, i) => (
        <span key={i} style={kindStyle(token.kind)}>
          {token.text}
          {insertSpaceBetween(token.text, parsed[i + 1]?.text)}
        </span>
      ))}
    </span>
  );

  if (line.source) {
    return (
      <a
        role="listitem"
        href={line.source}
        target="_blank"
        rel="noopener noreferrer"
        title="View source"
        class="verse-source-link"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0.3rem 0.75rem",
          fontSize: "0.75rem",
          fontFamily: "sans-serif",
          color: "var(--color-text)",
          gap: "0.375rem",
          textDecoration: "none",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.2rem",
            flexShrink: 0,
          }}
        >
          Line {line.line}:
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="14"
            viewBox="0 -960 960 960"
            width="14"
            fill="currentColor"
            style={{ display: "block", flexShrink: 0 }}
          >
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z" />
          </svg>
        </span>
        {preview}
      </a>
    );
  }

  return (
    <div
      role="listitem"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0.3rem 0.75rem",
        fontSize: "0.75rem",
        fontFamily: "sans-serif",
        color: "var(--color-text)",
        gap: "0.375rem",
        overflow: "hidden",
      }}
    >
      <span style={{ flexShrink: 0 }}>
        Line {line.line}:
      </span>
      {preview}
    </div>
  );
}
