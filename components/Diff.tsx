import type { JSX } from "preact/jsx-runtime";
import { diff, diffVersesPaired } from "../lib/diff.ts";
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

// Keeps an anchored verse (e.g. `#v-30`) clear of the sticky title bar.
// Update if the header height changes.
export const VERSE_SCROLL_MARGIN_TOP = "6.1875rem";

// The three markings are orthogonal, so they stack: a word the scribe inserted
// above the line and then struck reads as both raised and struck through.
function kindStyle(kinds: ManuscriptKind[] | ManuscriptKind) {
  const list = Array.isArray(kinds) ? kinds : [kinds];
  return {
    ...(list.includes("deleted") ? { textDecoration: "line-through" } : {}),
    ...(list.includes("unclear") ? { color: "var(--color-muted)" } : {}),
    ...(list.includes("inserted")
      ? { fontStyle: "italic", verticalAlign: "super" }
      : {}),
  };
}

function renderManuscriptToken(
  text: string | undefined,
  parsed: ManuscriptToken | undefined,
): JSX.Element {
  if (parsed?.segments) {
    return (
      <>
        {parsed.segments.map((seg, i) => (
          <span key={i} style={kindStyle(seg.kinds ?? seg.kind)}>
            {seg.text}
          </span>
        ))}
      </>
    );
  }
  return (
    <span style={kindStyle(parsed?.kinds ?? parsed?.kind ?? "normal")}>
      {text}
    </span>
  );
}

export interface DiffProps {
  verses1: Verse[];
  verses2: Verse[];
  startRow?: number;
  markedVerses?: Set<number> | null;
  perVerse?: boolean;
}

function renderVersePairCells(
  v1: Verse | undefined,
  v2: Verse | undefined,
  tokens1: JSX.Element[],
  tokens2: JSX.Element[],
  row: number,
  markedVerses?: Set<number> | null,
): JSX.Element[] {
  const isMarked1 = !!v1 && !!markedVerses?.has(v1.verse);
  const isMarked2 = !!v2 && !!markedVerses?.has(v2.verse);
  const cellStyle = {
    paddingTop: "0.5rem",
    paddingBottom: "0.5rem",
    margin: "0",
    scrollMarginTop: VERSE_SCROLL_MARGIN_TOP,
    gridRow: row,
  };

  return [
    <p
      key={`v1-${row}`}
      id={v1 ? `v-${v1.verse}` : undefined}
      data-verse={v1?.verse}
      data-col="1"
      data-marked={isMarked1 ? "" : undefined}
      class="col-start-1"
      style={cellStyle}
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
          {tokens1}
        </>
      )}
    </p>,
    <p
      key={`v2-${row}`}
      data-verse={v2?.verse}
      data-col="2"
      data-marked={isMarked2 ? "" : undefined}
      class="col-start-2"
      style={cellStyle}
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
          {tokens2}
        </>
      )}
    </p>,
  ];
}

export function Diff(
  { verses1, verses2, startRow = 1, markedVerses, perVerse = false }: DiffProps,
) {
  if (perVerse) {
    const allTexts1 = verses1.map((v) =>
      stripManuscriptMarkup(v.markdown ?? v.text)
    );
    const allTexts2 = verses2.map((v) =>
      stripManuscriptMarkup(v.markdown ?? v.text)
    );
    const paired = diffVersesPaired(allTexts1, allTexts2);
    const len = Math.max(verses1.length, verses2.length);
    const content: JSX.Element[] = [];

    for (let idx = 0; idx < len; idx++) {
      const v1 = verses1[idx];
      const v2 = verses2[idx];
      const d = paired[idx];
      const split1 = v1
        ? splitText(stripManuscriptMarkup(v1.markdown ?? v1.text))
        : [];
      const split2 = v2
        ? splitText(stripManuscriptMarkup(v2.markdown ?? v2.text))
        : [];
      const parsed1 = v1?.markdown
        ? parseManuscriptMarkup(v1.markdown)
        : undefined;
      const parsed2 = v2?.markdown
        ? parseManuscriptMarkup(v2.markdown)
        : undefined;

      const c1: JSX.Element[] = [];
      const c2: JSX.Element[] = [];
      let t1i = 0;
      let t2i = 0;

      for (const t of d) {
        const tok1 = split1[t1i];
        const tok2 = split2[t2i];

        if (t.removed) {
          t1i++;
          c1.push(
            <span
              class="highlight"
              style={{ backgroundColor: "var(--color-side1-highlight)" }}
            >
              {renderManuscriptToken(tok1, parsed1?.[t1i - 1])}
              {insertSpaceBetween(tok1, split1[t1i])}
            </span>,
          );
        }
        if (t.added) {
          t2i++;
          c2.push(
            <span
              class="highlight"
              style={{ backgroundColor: "var(--color-side2-highlight)" }}
            >
              {renderManuscriptToken(tok2, parsed2?.[t2i - 1])}
              {insertSpaceBetween(tok2, split2[t2i])}
            </span>,
          );
        }
        if (t.added === false && t.removed === false) {
          t1i++;
          t2i++;
          const id = crypto.randomUUID();
          c1.push(
            <WordMatch id={"a" + id}>
              {renderManuscriptToken(tok1, parsed1?.[t1i - 1])}
              {insertSpaceBetween(tok1, split1[t1i])}
            </WordMatch>,
          );
          c2.push(
            <WordMatch id={"b" + id}>
              {renderManuscriptToken(tok2, parsed2?.[t2i - 1])}
              {insertSpaceBetween(tok2, split2[t2i])}
            </WordMatch>,
          );
        }
      }

      content.push(
        ...renderVersePairCells(
          v1,
          v2,
          c1,
          c2,
          startRow + 1 + idx,
          markedVerses,
        ),
      );
    }

    return <>{content}</>;
  }
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
            scrollMarginTop: VERSE_SCROLL_MARGIN_TOP,
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
