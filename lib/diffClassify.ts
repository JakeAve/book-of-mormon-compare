import type { DiffKind, Token } from "./diff.ts";
import { isPunctuation } from "./textHelpers.ts";
import { levenshtein } from "./editDistance.ts";
import { isKnownVariant } from "./spellingVariants.ts";

// Short words (< 5 chars) make the ratio gate meaningless: "lord"→"word" is
// 1 edit / 4 chars = 0.25, under the ratio limit, yet is clearly a word change.
// MAX_VARIANT_RATIO ≈ one edit per three characters separates spelling variants
// from word changes; both thresholds are tunable against the corpus.
const MAX_VARIANT_DISTANCE = 3;
const MAX_VARIANT_RATIO = 0.34;
const MIN_VARIANT_LEN = 5;

function stripPunct(s: string): string {
  return s.replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&]+$/gu, "");
}

export function classifySubstitution(oldVal: string, newVal: string): DiffKind {
  if (isPunctuation(oldVal) || isPunctuation(newVal)) return "punctuation";

  if (oldVal.toLowerCase() === newVal.toLowerCase()) return "capitalization";

  const a = stripPunct(oldVal).toLowerCase();
  const b = stripPunct(newVal).toLowerCase();

  // The manuscripts write "and" as "&" throughout: nearly four in five spelling
  // matches were this one pair, drowning out the real orthographic variants.
  if ((a === "&" && b === "and") || (a === "and" && b === "&")) {
    return "ampersand";
  }

  if (isKnownVariant(a, b)) return "spelling";

  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (
    maxLen >= MIN_VARIANT_LEN && dist <= MAX_VARIANT_DISTANCE &&
    dist / maxLen <= MAX_VARIANT_RATIO
  ) {
    return "spelling";
  }

  return "wordChange";
}

function findBestMatch(
  removedVal: string,
  added: Token[],
  matched: Set<number>,
): number {
  const a = stripPunct(removedVal).toLowerCase();
  for (let m = 0; m < added.length; m++) {
    if (matched.has(m)) continue;
    if (isKnownVariant(a, stripPunct(added[m].value).toLowerCase())) return m;
  }
  for (let m = 0; m < added.length; m++) {
    if (matched.has(m)) continue;
    if (removedVal.toLowerCase() === added[m].value.toLowerCase()) return m;
  }
  for (let m = 0; m < added.length; m++) {
    if (!matched.has(m)) return m;
  }
  return -1;
}

export function classifyDiff(tokens: Token[]): Token[] {
  let i = 0;
  while (i < tokens.length) {
    if (!tokens[i].added && !tokens[i].removed) {
      i++;
      continue;
    }

    const removed: Token[] = [];
    const added: Token[] = [];
    let j = i;
    while (j < tokens.length && (tokens[j].added || tokens[j].removed)) {
      // Punctuation is classified in place and kept out of the pairing pools:
      // the Printer's Manuscript is largely unpunctuated, so leaving it in lets
      // a leftover word pair with a stray comma and read as a word change.
      if (isPunctuation(tokens[j].value)) tokens[j].kind = "punctuation";
      else if (tokens[j].removed) removed.push(tokens[j]);
      else added.push(tokens[j]);
      j++;
    }

    const matchedAdded = new Set<number>();
    for (let k = 0; k < removed.length; k++) {
      const idx = findBestMatch(removed[k].value, added, matchedAdded);
      if (idx === -1) {
        removed[k].kind = "omission";
      } else {
        matchedAdded.add(idx);
        const kind = classifySubstitution(removed[k].value, added[idx].value);
        removed[k].kind = kind;
        added[idx].kind = kind;
      }
    }
    for (let m = 0; m < added.length; m++) {
      if (!matchedAdded.has(m)) added[m].kind = "addition";
    }

    i = j;
  }
  return tokens;
}
