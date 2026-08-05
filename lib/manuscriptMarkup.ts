import { splitText } from "./textHelpers.ts";

export type ManuscriptKind = "normal" | "deleted" | "unclear" | "inserted";

export interface ManuscriptSegment {
  text: string;
  kind: ManuscriptKind;
  /** Every kind in force, since a word can be inserted and struck at once. */
  kinds?: ManuscriptKind[];
}

export interface ManuscriptToken {
  text: string;
  kind: ManuscriptKind;
  kinds?: ManuscriptKind[];
  segments?: ManuscriptSegment[];
}

// Insertions arrive in two notations from the Joseph Smith Papers transcripts:
// [inserted] and <inserted>, the latter padded with zero-width spaces. They mean
// the same thing — 1 Nephi 22:29 carries both in one verse.
const MARKERS = /~~|\{\{|\}\}|\[|\]|<|>|​/g;

export function stripManuscriptMarkup(markdown: string): string {
  return markdown.replace(MARKERS, "");
}

export function parseManuscriptMarkup(markdown: string): ManuscriptToken[] {
  // Phase 1: walk character by character, build kind-annotated stripped string
  // Use a stack so nested markers respect priority (deleted > unclear > inserted)
  const kindChars: ManuscriptKind[][] = [];
  let stripped = "";
  const stack: ManuscriptKind[] = [];
  let i = 0;

  // Every kind in force, in priority order. A struck insertion is both.
  const currentMode = (): ManuscriptKind[] => {
    const active = ORDER.filter((k) => stack.includes(k));
    return active.length ? active : ["normal"];
  };

  while (i < markdown.length) {
    if (markdown[i] === "~" && markdown[i + 1] === "~") {
      const idx = stack.lastIndexOf("deleted");
      if (idx !== -1) {
        stack.splice(idx, 1);
      } else {
        stack.push("deleted");
      }
      i += 2;
    } else if (markdown[i] === "{" && markdown[i + 1] === "{") {
      stack.push("unclear");
      i += 2;
    } else if (markdown[i] === "}" && markdown[i + 1] === "}") {
      const idx = stack.lastIndexOf("unclear");
      if (idx !== -1) stack.splice(idx, 1);
      i += 2;
    } else if (markdown[i] === "[" || markdown[i] === "<") {
      stack.push("inserted");
      i++;
    } else if (markdown[i] === "]" || markdown[i] === ">") {
      const idx = stack.lastIndexOf("inserted");
      if (idx !== -1) stack.splice(idx, 1);
      i++;
    } else if (markdown[i] === "​") {
      i++;
    } else {
      kindChars.push(currentMode());
      stripped += markdown[i];
      i++;
    }
  }

  // Phase 2: tokenize stripped string using the same logic as Diff.tsx
  const tokens = splitText(stripped);
  if (tokens.length === 0) return [];

  // Phase 3: map each token to its dominant kind via character position,
  // recording per-character segments when a token spans multiple kinds.
  const result: ManuscriptToken[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const pos = stripped.indexOf(token, cursor);
    if (pos === -1) {
      result.push({ text: token, kind: "normal", kinds: ["normal"] });
      continue;
    }

    const segments: ManuscriptSegment[] = [];
    let segStart = 0;
    let segKinds = kindChars[pos];
    for (let j = 1; j <= token.length; j++) {
      const nextKinds = j < token.length ? kindChars[pos + j] : null;
      if (nextKinds === null || key(nextKinds) !== key(segKinds)) {
        segments.push({
          text: token.slice(segStart, j),
          kind: dominantKind(segKinds),
          kinds: segKinds,
        });
        segStart = j;
        if (nextKinds !== null) segKinds = nextKinds;
      }
    }

    cursor = pos + token.length;
    const allKinds = ORDER.filter((k) =>
      segments.some((s) => s.kinds?.includes(k))
    );
    result.push({
      text: token,
      kind: dominantKind(allKinds),
      kinds: allKinds.length ? allKinds : ["normal"],
      segments: segments.length > 1 ? segments : undefined,
    });
  }
  return result;
}

const ORDER: ManuscriptKind[] = ["deleted", "unclear", "inserted"];

const key = (kinds: ManuscriptKind[]) => kinds.join("+");

function dominantKind(kinds: ManuscriptKind[]): ManuscriptKind {
  return ORDER.find((k) => kinds.includes(k)) ?? "normal";
}
