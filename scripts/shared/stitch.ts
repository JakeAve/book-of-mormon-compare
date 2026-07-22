// Decide how to stitch manuscript line fragments back into a continuous verse.
// At each line boundary we have to choose between joining with a space ("a /
// ship" → "a ship") or no separator ("wildern / ess" → "wilderness"). The
// canonical 2013 verse text is our source of truth: word bigrams that appear
// in canon signal a word boundary, merged single words in canon signal a
// mid-word break.

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

export interface CanonIndex {
  words: Set<string>;
  bigrams: Set<string>;
  /** Normalized forms of canon tokens that are themselves hyphenated
   *  compounds (e.g. "judgment-seat" → "judgmentseat"). A merged tail+head
   *  that lands here is a genuine compound word, not a printer's line-wrap
   *  hyphen, even though it also matches `words` (which normalizes away the
   *  hyphen for every token). */
  hyphenatedWords: Set<string>;
}

export function buildCanonIndex(canonText: string): CanonIndex {
  const rawTokens = canonText.split(/\s+/).filter((w) => w.length > 0);
  const tokens = rawTokens.map(normalize).filter((w) => w.length > 0);
  const words = new Set(tokens);
  const hyphenatedWords = new Set(
    rawTokens.filter((w) => w.includes("-")).map(normalize),
  );
  const bigrams = new Set<string>();
  for (let i = 0; i + 1 < tokens.length; i++) {
    bigrams.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return { words, bigrams, hyphenatedWords };
}

function fuzzyWordHit(s: string, words: Set<string>): boolean {
  if (s.length < 5) return false;
  for (const w of words) {
    if (w.length < 4) continue;
    if (Math.abs(w.length - s.length) > 2) continue;
    if (editDistance(s, w) <= 1) return true;
  }
  return false;
}

/** Return " " for a word boundary, "" for a mid-word break. */
export function decideJoin(
  tail: string,
  head: string,
  canon: CanonIndex,
): " " | "" {
  const t = normalize(tail);
  const h = normalize(head);
  if (!t || !h) return " ";
  if (canon.bigrams.has(`${t} ${h}`)) return " ";
  const merged = t + h;
  if (canon.words.has(merged) || fuzzyWordHit(merged, canon.words)) return "";
  return " ";
}

export interface JoinableLine {
  text: string;
  markdown?: string;
}

export function applyJoins(lines: JoinableLine[], canon: CanonIndex): void {
  for (let i = 0; i + 1 < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    const tailTokens = a.text.trim().split(/\s+/);
    const headTokens = b.text.trim().split(/\s+/);
    const tail = tailTokens[tailTokens.length - 1] ?? "";
    const head = headTokens[0] ?? "";
    if (tail.endsWith("-")) {
      // A trailing hyphen is ambiguous: it could be the printer breaking a
      // single word across the line (drop it) or a genuine hyphenated
      // compound that happens to fall at the line break (keep it). Only
      // drop it when canon confirms the merged form is a real word AND
      // canon doesn't already know it as a hyphenated compound.
      const merged = normalize(tail.slice(0, -1)) + normalize(head);
      const isGenuineCompound = canon.hyphenatedWords.has(merged);
      const isLineWrapHyphen = !isGenuineCompound &&
        (canon.words.has(merged) || fuzzyWordHit(merged, canon.words));
      if (isLineWrapHyphen) {
        a.text = a.text.replace(/-$/, "");
        if (a.markdown !== undefined) {
          a.markdown = a.markdown.replace(/-$/, "");
        }
      }
      continue;
    }
    const sep = decideJoin(tail, head, canon);
    if (sep === " ") {
      a.text += " ";
      if (a.markdown !== undefined) a.markdown += " ";
    }
  }
}
