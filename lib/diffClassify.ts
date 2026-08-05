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

function letters(tokens: Token[]): string {
  return tokens.map((t) => t.value).join("").toLowerCase().replace(
    /[^\p{L}\p{N}]/gu,
    "",
  );
}

/** A curated variant or an exact match — signals strong enough to pair on sight. */
function strongMatch(
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
  return -1;
}

function distance(x: string, y: string): number {
  const a = stripPunct(x).toLowerCase();
  const b = stripPunct(y).toLowerCase();
  const max = Math.max(a.length, b.length);
  return max === 0 ? 0 : levenshtein(a, b) / max;
}

function pair(removed: Token, added: Token) {
  const kind = classifySubstitution(removed.value, added.value);
  removed.kind = kind;
  added.kind = kind;
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

    // Same letters, different word division: "first born"/"firstborn",
    // "Judgmentseat"/"judgment-seat". Pairing these token-for-token always
    // strands a half, so settle the whole run before matching runs at all.
    if (
      removed.length && added.length && removed.length !== added.length &&
      letters(removed) === letters(added)
    ) {
      for (const t of [...removed, ...added]) t.kind = "spelling";
      i = j;
      continue;
    }

    const matchedAdded = new Set<number>();
    const unpaired: number[] = [];
    for (let k = 0; k < removed.length; k++) {
      const idx = strongMatch(removed[k].value, added, matchedAdded);
      if (idx === -1) unpaired.push(k);
      else {
        matchedAdded.add(idx);
        pair(removed[k], added[idx]);
      }
    }

    // What's left pairs by closest spelling, globally best pair first. Taking
    // the first free slot instead let an unrelated leftover claim a candidate
    // that was a near-identical match for a later token.
    while (unpaired.length) {
      let best: { k: number; m: number; d: number } | undefined;
      for (const k of unpaired) {
        for (let m = 0; m < added.length; m++) {
          if (matchedAdded.has(m)) continue;
          const d = distance(removed[k].value, added[m].value);
          if (!best || d < best.d) best = { k, m, d };
        }
      }
      if (!best) break;
      matchedAdded.add(best.m);
      pair(removed[best.k], added[best.m]);
      unpaired.splice(unpaired.indexOf(best.k), 1);
    }

    for (const k of unpaired) removed[k].kind = "omission";
    for (let m = 0; m < added.length; m++) {
      if (!matchedAdded.has(m)) added[m].kind = "addition";
    }

    i = j;
  }
  return tokens;
}
