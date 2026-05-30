import { splitText } from "./textHelpers.ts";

export type DiffKind =
  | "capitalization"
  | "spelling"
  | "addition"
  | "omission"
  | "wordChange";

export interface Token {
  value: string;
  added?: boolean;
  removed?: boolean;
  kind?: DiffKind; // set only on changed tokens (added || removed)
}

export function diff(oldText: string, newText: string): Token[] {
  let oldTokens = splitText(oldText);
  let newTokens = splitText(newText);

  const changes: Token[] = [];

  let start = 0;
  while (
    start < oldTokens.length && start < newTokens.length &&
    oldTokens[start] === newTokens[start]
  ) {
    changes.push({ value: oldTokens[start], added: false, removed: false });
    start++;
  }

  let oldEnd = oldTokens.length;
  let newEnd = newTokens.length;
  const suffix: Token[] = [];
  while (
    oldEnd > start && newEnd > start &&
    oldTokens[oldEnd - 1] === newTokens[newEnd - 1]
  ) {
    suffix.push({ value: oldTokens[oldEnd - 1], added: false, removed: false });
    oldEnd--;
    newEnd--;
  }

  oldTokens = oldTokens.slice(start, oldEnd);
  newTokens = newTokens.slice(start, newEnd);

  const m = oldTokens.length;
  const n = newTokens.length;

  const matrix = Array.from(
    { length: m + 1 },
    (_, i) => Int32Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : i)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      matrix[i][j] = oldTokens[i - 1] === newTokens[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1]);
    }
  }

  let i = m;
  let j = n;
  const middle: Token[] = [];
  while (i > 0 && j > 0) {
    if (oldTokens[i - 1] === newTokens[j - 1]) {
      middle.push({ value: oldTokens[i - 1], added: false, removed: false });
      i--;
      j--;
    } else if (matrix[i - 1][j] < matrix[i][j - 1]) {
      middle.push({ value: oldTokens[i - 1], removed: true });
      i--;
    } else {
      middle.push({ value: newTokens[j - 1], added: true });
      j--;
    }
  }
  while (i > 0) {
    middle.push({ value: oldTokens[i - 1], removed: true });
    i--;
  }
  while (j > 0) {
    middle.push({ value: newTokens[j - 1], added: true });
    j--;
  }

  middle.reverse();
  suffix.reverse();

  return [...changes, ...middle, ...suffix];
}

export function diffVersesPaired(
  verses1: string[],
  verses2: string[],
): Token[][] {
  const len = Math.max(verses1.length, verses2.length);
  const result: Token[][] = [];
  for (let i = 0; i < len; i++) {
    result.push(diff(verses1[i] ?? "", verses2[i] ?? ""));
  }
  return result;
}
