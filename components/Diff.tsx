import type { JSX } from "preact/jsx-runtime";
import { diff } from "../lib/diff.ts";
import { insertSpaceBetween, splitText } from "../lib/textHelpers.ts";
import type { Verse } from "../lib/data.ts";
import WordMatch from "./WordMatch.tsx";
import {
  type ManuscriptKind,
  type ManuscriptToken,
  parseManuscriptMarkup,
  stripManuscriptMarkup,
} from "../lib/manuscriptMarkup.ts";
import VerseLinePopup from "../islands/VerseLinePopup.tsx";

function verseLabel(verse: number) {
  return verse === 0 ? "Intro" : verse;
}

function kindStyle(kind: ManuscriptKind) {
  switch (kind) {
    case "deleted":
      return { textDecoration: "line-through" };
    case "unclear":
      return { color: "var(--color-muted)" };
    case "inserted":
      return {
        fontStyle: "italic",
        verticalAlign: "super",
      };
    default:
      return {};
  }
}

function renderManuscriptToken(
  text: string | undefined,
  parsed: ManuscriptToken | undefined,
): JSX.Element {
  if (parsed?.segments) {
    return (
      <>
        {parsed.segments.map((seg, i) => (
          <span key={i} style={kindStyle(seg.kind)}>{seg.text}</span>
        ))}
      </>
    );
  }
  return <span style={kindStyle(parsed?.kind ?? "normal")}>{text}</span>;
}

export interface DiffProps {
  verses1: Verse[];
  verses2: Verse[];
  startRow?: number;
  markedVerses?: Set<number> | null;
}

export function Diff(
  { verses1, verses2, startRow = 1, markedVerses }: DiffProps,
) {
  const text1 = verses1.map((v) => stripManuscriptMarkup(v.markdown ?? v.text))
    .join("\n");
  const text2 = verses2.map((v) => stripManuscriptMarkup(v.markdown ?? v.text))
    .join("\n");

  const d = diff(text1, text2);

  let row1 = startRow + 1;
  let row2 = startRow + 1;

  let v1Idx = 0;
  let v1: Verse | undefined = verses1[v1Idx];
  let split1 = v1
    ? splitText(stripManuscriptMarkup(v1.markdown ?? v1.text))
    : undefined;
  let parsed1 = v1?.markdown ? parseManuscriptMarkup(v1.markdown) : undefined;
  let t1Idx = 0;
  let c1: JSX.Element[] = [];

  let v2Idx = 0;
  let v2: Verse | undefined = verses2[v2Idx];
  let split2 = v2
    ? splitText(stripManuscriptMarkup(v2.markdown ?? v2.text))
    : undefined;
  let parsed2 = v2?.markdown ? parseManuscriptMarkup(v2.markdown) : undefined;
  let t2Idx = 0;
  let c2: JSX.Element[] = [];
  let currRows1: number[] = [];

  const content: JSX.Element[] = [];

  let i = 0;
  while (i < d.length) {
    const t = d[i];
    const t1 = split1?.[t1Idx];
    const t2 = split2?.[t2Idx];

    if (t.removed) {
      t1Idx++;
      c1.push(
        <span
          class="highlight"
          style={{ backgroundColor: "var(--color-side1-highlight)" }}
        >
          {renderManuscriptToken(t1, parsed1?.[t1Idx - 1])}
          {insertSpaceBetween(t1, split1?.[t1Idx])}
        </span>,
      );
    }

    if (t.added) {
      t2Idx++;
      c2.push(
        <span
          class="highlight"
          style={{ backgroundColor: "var(--color-side2-highlight)" }}
        >
          {renderManuscriptToken(t2, parsed2?.[t2Idx - 1])}
          {insertSpaceBetween(t2, split2?.[t2Idx])}
        </span>,
      );
    }

    if (t.added === false && t.removed === false) {
      t1Idx++;
      t2Idx++;
      currRows1.push(row1);
      const id = crypto.randomUUID();

      c1.push(
        <WordMatch id={"a" + id}>
          {renderManuscriptToken(t1, parsed1?.[t1Idx - 1])}
          {insertSpaceBetween(t1, split1?.[t1Idx])}
        </WordMatch>,
      );
      c2.push(
        <WordMatch id={"b" + id}>
          {renderManuscriptToken(t2, parsed2?.[t2Idx - 1])}
          {insertSpaceBetween(t2, split2?.[t2Idx])}
        </WordMatch>,
      );
    }

    if (t1Idx === split1?.length) {
      const isMarked = !!v1 && !!markedVerses?.has(v1.verse);
      content.push(
        <p
          id={v1 ? `v-${v1.verse}` : undefined}
          data-verse={v1?.verse}
          data-col="1"
          data-marked={isMarked ? "" : undefined}
          class="col-start-1"
          style={{
            gridRow: row1,
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            margin: "0",
            scrollMarginTop: "6rem",
          }}
        >
          {v1 && (
            <>
              {v1.lines
                ? <VerseLinePopup verse={v1.verse} lines={v1.lines} />
                : v1.source
                ? (
                  <a
                    href={v1.source}
                    target="_blank"
                    title="View source"
                    data-tutorial="verse-source"
                    style={{
                      color: "var(--color-verse-num)",
                      fontSize: "0.6875rem",
                      fontFamily: "sans-serif",
                      fontWeight: "500",
                      marginRight: "0.375rem",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    {verseLabel(v1.verse)}
                  </a>
                )
                : (
                  <span
                    style={{
                      color: "var(--color-verse-num)",
                      fontSize: "0.6875rem",
                      fontFamily: "sans-serif",
                      fontWeight: "500",
                      marginRight: "0.375rem",
                    }}
                  >
                    {verseLabel(v1.verse)}
                  </span>
                )}
              {c1}
            </>
          )}
        </p>,
      );
      t1Idx = 0;
      v1Idx++;
      v1 = verses1[v1Idx];
      split1 = v1
        ? splitText(stripManuscriptMarkup(v1.markdown ?? v1.text))
        : undefined;
      parsed1 = v1?.markdown ? parseManuscriptMarkup(v1.markdown) : undefined;
      c1 = [];
      row1++;
      if (verses1.length !== verses2.length) {
        row1 = Math.max(row1, row2);
      }
      currRows1 = [];
    }

    if (t2Idx === split2?.length) {
      const isMarkedV2 = !!v2 && !!markedVerses?.has(v2.verse);
      content.push(
        <p
          data-verse={v2?.verse}
          data-col="2"
          data-marked={isMarkedV2 ? "" : undefined}
          class="col-start-2"
          style={{
            gridRow: `${row2} / ${
              row2 < row1 ? currRows1.at(-1) ?? row2 : row2
            }`,
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            margin: "0",
          }}
        >
          {v2 && (
            <>
              {v2.lines
                ? <VerseLinePopup verse={v2.verse} lines={v2.lines} />
                : v2.source
                ? (
                  <a
                    href={v2.source}
                    target="_blank"
                    title="View source"
                    data-tutorial="verse-source"
                    style={{
                      color: "var(--color-verse-num)",
                      fontSize: "0.6875rem",
                      fontFamily: "sans-serif",
                      fontWeight: "500",
                      marginRight: "0.375rem",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    {verseLabel(v2.verse)}
                  </a>
                )
                : (
                  <span
                    style={{
                      color: "var(--color-verse-num)",
                      fontSize: "0.6875rem",
                      fontFamily: "sans-serif",
                      fontWeight: "500",
                      marginRight: "0.375rem",
                    }}
                  >
                    {verseLabel(v2.verse)}
                  </span>
                )}
              {c2}
            </>
          )}
        </p>,
      );
      t2Idx = 0;
      v2Idx++;
      v2 = verses2[v2Idx];
      split2 = v2
        ? splitText(stripManuscriptMarkup(v2.markdown ?? v2.text))
        : undefined;
      parsed2 = v2?.markdown ? parseManuscriptMarkup(v2.markdown) : undefined;
      c2 = [];
      row2++;
      if (verses1.length !== verses2.length) {
        row2 = Math.max(row1, row2);
      }
    }

    i++;
  }

  return <>{content}</>;
}
