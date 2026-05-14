import { splitText } from "./textHelpers.ts";

export type ManuscriptKind = "normal" | "deleted" | "unclear" | "inserted";

export interface ManuscriptToken {
  text: string;
  kind: ManuscriptKind;
}

export function stripManuscriptMarkup(markdown: string): string {
  return markdown.replace(/~~|\{\{|\}\}|\[|\]/g, "");
}

export function parseManuscriptMarkup(markdown: string): ManuscriptToken[] {
  // Phase 1: walk character by character, build kind-annotated stripped string
  // Use a stack so nested markers respect priority (deleted > unclear > inserted)
  const kindChars: ManuscriptKind[] = [];
  let stripped = "";
  const stack: ManuscriptKind[] = [];
  let i = 0;

  const currentMode = (): ManuscriptKind => {
    if (stack.includes("deleted")) return "deleted";
    if (stack.includes("unclear")) return "unclear";
    if (stack.includes("inserted")) return "inserted";
    return "normal";
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
    } else if (markdown[i] === "[") {
      stack.push("inserted");
      i++;
    } else if (markdown[i] === "]") {
      const idx = stack.lastIndexOf("inserted");
      if (idx !== -1) stack.splice(idx, 1);
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

  // Phase 3: map each token to its dominant kind via character position
  const result: ManuscriptToken[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const pos = stripped.indexOf(token, cursor);
    if (pos === -1) {
      // Unreachable in practice: the stripped string was built from the same
      // characters as the tokens (splitText result), so indexOf will always succeed.
      // This guards against potential bugs in the pipeline.
      result.push({ text: token, kind: "normal" });
      continue;
    }
    const kinds = new Set<ManuscriptKind>();
    for (let j = 0; j < token.length; j++) {
      kinds.add(kindChars[pos + j]);
    }
    cursor = pos + token.length;
    result.push({ text: token, kind: dominantKind(kinds) });
  }
  return result;
}

function dominantKind(kinds: Set<ManuscriptKind>): ManuscriptKind {
  if (kinds.has("deleted")) return "deleted";
  if (kinds.has("unclear")) return "unclear";
  if (kinds.has("inserted")) return "inserted";
  return "normal";
}
